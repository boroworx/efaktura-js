import { defineConfig } from 'vitepress'

/**
 * GitHub Pages serves a project site under /<repo>/, so the base path must
 * match the repository name. Override with DOCS_BASE when the repo is named
 * differently, or set it to '/' for a user/organisation page.
 */
const base = process.env.DOCS_BASE ?? '/efaktura-js/'

export default defineConfig({
  base,
  lang: 'sr-Latn-RS',
  title: 'efaktura-js',
  description:
    'JavaScript i TypeScript klijent za Sistem elektronskih faktura (SEF) — ' +
    'sve operacije javnog API-ja, uz kreiranje i čitanje UBL 2.1 dokumenata.',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: false,

  head: [
    ['meta', { name: 'theme-color', content: '#c6362c' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'sr_RS' }],
    ['meta', { property: 'og:title', content: 'efaktura-js — klijent za SEF' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'JavaScript klijent za Sistem elektronskih faktura (SEF): sve operacije ' +
          'javnog API-ja i UBL 2.1 dokumenti.',
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: 'Uvod', link: '/uvod/instalacija' },
      { text: 'Vodiči', link: '/vodici/izlazne-fakture' },
      { text: 'UBL', link: '/ubl/pregled' },
      { text: 'API referenca', link: '/api/klijent' },
      { text: 'Alatke', link: '/alatke/pregled-ubl' },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/efaktura-js',
      },
    ],

    sidebar: [
      {
        text: 'Uvod',
        collapsed: false,
        items: [
          { text: 'Šta je efaktura-js', link: '/uvod/instalacija' },
          { text: 'API ključ', link: '/uvod/api-kljuc' },
          { text: 'Okruženja', link: '/uvod/okruzenja' },
          { text: 'Brzi početak', link: '/uvod/brzi-pocetak' },
        ],
      },
      {
        text: 'Vodiči',
        collapsed: false,
        items: [
          { text: 'Izlazne fakture', link: '/vodici/izlazne-fakture' },
          { text: 'Ulazne fakture', link: '/vodici/ulazne-fakture' },
          { text: 'Evidencija PDV-a', link: '/vodici/evidencija-pdv' },
          { text: 'CRF i budžetski korisnici', link: '/vodici/crf' },
          { text: 'Notifikacije o promeni statusa', link: '/vodici/notifikacije' },
          { text: 'Greške i ponavljanje zahteva', link: '/vodici/greske' },
          { text: 'Ograničenje broja zahteva', link: '/vodici/ogranicenja' },
        ],
      },
      {
        text: 'UBL 2.1',
        collapsed: false,
        items: [
          { text: 'Pregled', link: '/ubl/pregled' },
          { text: 'Kreiranje fakture', link: '/ubl/kreiranje' },
          { text: 'Čitanje fakture', link: '/ubl/citanje' },
          { text: 'Iznosi i zaokruživanje', link: '/ubl/iznosi' },
          { text: 'Šifarnici', link: '/ubl/sifarnici' },
        ],
      },
      {
        text: 'Alatke',
        collapsed: false,
        items: [{ text: 'Pregled UBL fakture', link: '/alatke/pregled-ubl' }],
      },
      {
        text: 'API referenca',
        collapsed: false,
        items: [
          { text: 'Klijent', link: '/api/klijent' },
          { text: 'Izlazne fakture', link: '/api/izlazne-fakture' },
          { text: 'Ulazne fakture', link: '/api/ulazne-fakture' },
          { text: 'Evidencija PDV-a', link: '/api/pdv' },
          { text: 'Ostali resursi', link: '/api/ostalo' },
          { text: 'Sve operacije', link: '/api/operacije' },
        ],
      },
      {
        text: 'Ostalo',
        collapsed: false,
        items: [
          { text: 'Šta nije pokriveno', link: '/ostalo/obim' },
          { text: 'Regenerisanje iz specifikacije', link: '/ostalo/generisanje' },
          { text: 'Doprinos projektu', link: '/ostalo/doprinos' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/boroworx/efaktura-js' }],

    footer: {
      message:
        'Objavljeno pod MIT licencom. Nezvanična biblioteka — nije povezana s ' +
        'Ministarstvom finansija Republike Srbije.',
      copyright: 'efaktura-js',
    },

    // VitePress ships English UI strings; these are the Serbian equivalents.
    outline: { level: [2, 3], label: 'Na ovoj stranici' },
    docFooter: { prev: 'Prethodna', next: 'Sledeća' },
    darkModeSwitchLabel: 'Izgled',
    lightModeSwitchTitle: 'Pređi na svetlu temu',
    darkModeSwitchTitle: 'Pređi na tamnu temu',
    sidebarMenuLabel: 'Sadržaj',
    returnToTopLabel: 'Na vrh',
    langMenuLabel: 'Promeni jezik',
    lastUpdated: {
      text: 'Poslednja izmena',
      formatOptions: { dateStyle: 'medium', forceLocale: true },
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: 'Pretraga', buttonAriaLabel: 'Pretraga' },
              modal: {
                displayDetails: 'Prikaži detalje',
                resetButtonTitle: 'Poništi pretragu',
                backButtonTitle: 'Zatvori pretragu',
                noResultsText: 'Nema rezultata za',
                footer: {
                  selectText: 'za izbor',
                  selectKeyAriaLabel: 'enter',
                  navigateText: 'za kretanje',
                  navigateUpKeyAriaLabel: 'strelica gore',
                  navigateDownKeyAriaLabel: 'strelica dole',
                  closeText: 'za zatvaranje',
                  closeKeyAriaLabel: 'escape',
                },
              },
            },
          },
        },
      },
    },
  },
})
