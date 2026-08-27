import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import UblInspektor from './components/UblInspektor.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('UblInspektor', UblInspektor)
  },
} satisfies Theme
