/**
 * Just enough XML for UBL 2.1 — no external dependency, and no DOM.
 *
 * UBL is order-sensitive: the schema declares sequences, so children are held
 * as an ordered array rather than an object whose key order is incidental.
 */

export interface XmlElement {
  name: string
  attrs?: Record<string, string | number | undefined>
  /** Ordered children. Strings are text content. */
  children?: Array<XmlNode>
}

export type XmlNode = XmlElement | string | null | undefined | false

/** Build an element, dropping nullish children so callers can inline conditionals. */
export function el(
  name: string,
  attrs?: Record<string, string | number | undefined> | null,
  children?: XmlNode[] | XmlNode,
): XmlElement {
  const kids = children === undefined ? [] : Array.isArray(children) ? children : [children]
  return {
    name,
    attrs: attrs ?? undefined,
    children: kids.filter((c) => c !== null && c !== undefined && c !== false),
  }
}

/** An element holding a single text value, or `undefined` when there is no value. */
export function leaf(
  name: string,
  value: string | number | undefined | null,
  attrs?: Record<string, string | number | undefined>,
): XmlElement | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return el(name, attrs, String(value))
}

export function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}

export function escapeAttr(value: string): string {
  return value
    .replace(/[&<>"]/g, (c) =>
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
    )
    .replace(/[\r\n\t]/g, (c) => (c === '\r' ? '&#13;' : c === '\n' ? '&#10;' : '&#9;'))
}

export interface SerializeOptions {
  /** Two spaces per level by default; pass `''` for a single line. */
  indent?: string
  declaration?: boolean
}

export function serialize(root: XmlElement, options: SerializeOptions = {}): string {
  const indent = options.indent ?? '  '
  const out: string[] = []
  if (options.declaration !== false) out.push('<?xml version="1.0" encoding="UTF-8"?>')
  write(root, 0)
  return out.join(indent ? '\n' : '')

  function write(node: XmlElement, depth: number) {
    const pad = indent.repeat(depth)
    const attrs = Object.entries(node.attrs ?? {})
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => ` ${k}="${escapeAttr(String(v))}"`)
      .join('')
    const kids = node.children ?? []
    if (kids.length === 0) {
      out.push(`${pad}<${node.name}${attrs}/>`)
      return
    }
    // Text-only elements stay on one line, which is how UBL is conventionally
    // written and keeps golden fixtures readable.
    if (kids.length === 1 && typeof kids[0] === 'string') {
      out.push(`${pad}<${node.name}${attrs}>${escapeText(kids[0])}</${node.name}>`)
      return
    }
    out.push(`${pad}<${node.name}${attrs}>`)
    for (const kid of kids) {
      if (kid === null || kid === undefined || kid === false) continue
      if (typeof kid === 'string') out.push(`${indent.repeat(depth + 1)}${escapeText(kid)}`)
      else write(kid, depth + 1)
    }
    out.push(`${pad}</${node.name}>`)
  }
}

// ------------------------------------------------------------------ parsing

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10))
    return ENTITIES[body] ?? match
  })
}

/**
 * Parse an XML document into the same shape `serialize` accepts.
 *
 * Deliberately narrow: elements, attributes, text, CDATA, comments, and the
 * declaration. No DTDs, no entity definitions, no namespace resolution —
 * prefixed names are kept verbatim, which is what the UBL reader wants.
 */
export function parse(xml: string): XmlElement {
  let i = 0
  const stack: XmlElement[] = []
  let root: XmlElement | undefined

  const skipTo = (marker: string) => {
    const at = xml.indexOf(marker, i)
    i = at === -1 ? xml.length : at + marker.length
  }

  while (i < xml.length) {
    const lt = xml.indexOf('<', i)
    if (lt === -1) break

    if (lt > i) {
      const text = xml.slice(i, lt)
      if (text.trim() && stack.length) {
        stack[stack.length - 1]!.children!.push(decodeEntities(text.trim()))
      }
    }
    i = lt

    if (xml.startsWith('<?', i)) { skipTo('?>'); continue }
    if (xml.startsWith('<!--', i)) { skipTo('-->'); continue }
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i)
      const text = xml.slice(i + 9, end === -1 ? xml.length : end)
      if (stack.length) stack[stack.length - 1]!.children!.push(text)
      i = end === -1 ? xml.length : end + 3
      continue
    }
    if (xml.startsWith('<!', i)) { skipTo('>'); continue }

    if (xml.startsWith('</', i)) {
      const end = xml.indexOf('>', i)
      if (end === -1) throw new SyntaxError('Unterminated closing tag')
      const name = xml.slice(i + 2, end).trim()
      const open = stack.pop()
      if (!open) throw new SyntaxError(`Unexpected closing tag </${name}>`)
      if (open.name !== name) {
        throw new SyntaxError(`Mismatched tags: <${open.name}> closed by </${name}>`)
      }
      i = end + 1
      continue
    }

    // Opening tag. Find the '>' that is not inside an attribute value.
    let j = i + 1
    let quote: string | null = null
    for (; j < xml.length; j++) {
      const c = xml[j]!
      if (quote) { if (c === quote) quote = null; continue }
      if (c === '"' || c === "'") { quote = c; continue }
      if (c === '>') break
    }
    if (j >= xml.length) throw new SyntaxError('Unterminated tag')

    let inner = xml.slice(i + 1, j)
    const selfClosing = inner.endsWith('/')
    if (selfClosing) inner = inner.slice(0, -1)

    const nameMatch = /^([^\s/>]+)/.exec(inner)
    if (!nameMatch) throw new SyntaxError('Malformed tag')
    const name = nameMatch[1]!
    const attrs: Record<string, string> = {}
    const attrRe = /([^\s=/]+)\s*=\s*("([^"]*)"|'([^']*)')/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(inner.slice(name.length)))) {
      attrs[m[1]!] = decodeEntities(m[3] ?? m[4] ?? '')
    }

    const node: XmlElement = {
      name,
      attrs: Object.keys(attrs).length ? attrs : undefined,
      children: [],
    }
    if (stack.length) stack[stack.length - 1]!.children!.push(node)
    else if (root) throw new SyntaxError('Multiple root elements')
    else root = node
    if (!selfClosing) stack.push(node)
    i = j + 1
  }

  if (stack.length) throw new SyntaxError(`Unclosed element <${stack[stack.length - 1]!.name}>`)
  if (!root) throw new SyntaxError('No root element')
  return root
}

// ------------------------------------------------------------- reading help

/** Strip any namespace prefix: `cbc:ID` -> `ID`. */
export const localName = (name: string): string => {
  const at = name.indexOf(':')
  return at === -1 ? name : name.slice(at + 1)
}

/** Direct child elements matching a local name. */
export function childrenNamed(node: XmlElement, name: string): XmlElement[] {
  return (node.children ?? []).filter(
    (c): c is XmlElement => typeof c === 'object' && !!c && localName(c.name) === name,
  )
}

export function child(node: XmlElement | undefined, ...path: string[]): XmlElement | undefined {
  let current = node
  for (const step of path) {
    if (!current) return undefined
    current = childrenNamed(current, step)[0]
  }
  return current
}

/** Concatenated text of an element, or `undefined` when it has none. */
export function text(node: XmlElement | undefined): string | undefined {
  if (!node) return undefined
  const parts = (node.children ?? []).filter((c): c is string => typeof c === 'string')
  return parts.length ? parts.join('') : undefined
}

/** Text of a descendant reached by local names. */
export const textAt = (node: XmlElement | undefined, ...path: string[]): string | undefined =>
  text(child(node, ...path))

export const attr = (node: XmlElement | undefined, name: string): string | undefined =>
  node?.attrs?.[name] as string | undefined
