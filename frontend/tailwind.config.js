import vueformPlugin from '@vueform/vueform/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './vueform.config.ts',
    './node_modules/@vueform/vueform/themes/tailwind/**/*.vue',
    './node_modules/@vueform/vueform/themes/tailwind/**/*.js',
  ],

  darkMode: 'class',
  theme: {
    extend: {
      // EU colours according to the Europa Component Library: https://ec.europa.eu/component-library/ec/guidelines/colours/
      colors: {
        'eu-primary': '#3860ED',
        'eu-primary-20': '#D8E0FB',
        'eu-primary-40': '#B1C0F8',
        'eu-primary-60': '#89A1F4',
        'eu-primary-80': '#5577F0',
        'eu-primary-100': '#3860ED',
        'eu-primary-120': '#143FD9',
        'eu-primary-140': '#0F2FA2',
        'eu-primary-160': '#0A1F6C',
        'eu-primary-180': '#051036',

        'eu-secondary-180': '#8F5600',
        'eu-secondary-160': '#E08700',
        'eu-secondary-140': '#FF9D0A',
        'eu-secondary-120': '#FFAD33',
        'eu-secondary-100': '#FFBE5C',
        'eu-secondary-80': '#FFCB7C',
        'eu-secondary-60': '#FFD89D',
        'eu-secondary-40': '#FFE5BE',
        'eu-secondary-20': '#FFF2DE',

        'eu-dark-100':'#26324B',
        'eu-dark-80':'#546FA6',
        'eu-dark-60':'#99AACC',

        'eu-accent-160': '#887DE8',
        'eu-accent-140': '#978CF2',
        'eu-accent-120': '#A89EFA',
        'eu-accent-100': '#BBB3FF',
        'eu-accent-80': '#BFB2FF',
        'eu-accent-60': '#D1CCFF',
        'eu-accent-40': '#FAFAFF',

        'eu-info':'#3860ED',
        'eu-success':'#24A148',
        'eu-warning':'#F39811',
        'eu-error':'#DA1E28',

        'eu-neutral-180':'#6C85D1',
        'eu-neutral-160':'#7F95D7',
        'eu-neutral-140':'#92A5DD',
        'eu-neutral-120':'#A6B5E3',
        'eu-neutral-100':'#B9C5E9',
        'eu-neutral-80':'#CDD5EF',
        'eu-neutral-60':'#E0E5F5',
        'eu-neutral-40':'#F3F5FB',
        'eu-neutral-20':'#F8F9FD',

        'eu-background':'#FCFCFC',
        'eu-branding':'#004494',
        'eu-white':'#FFFFFF',

      },
    },

  },
  plugins: [
    vueformPlugin,
  ]
}