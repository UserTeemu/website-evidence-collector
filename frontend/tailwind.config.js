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

        'eu-accent-160': '#887DE8',
        'eu-accent-140': '#978CF2',
        'eu-accent-120': '#A89EFA',
        'eu-accent-100': '#BBB3FF',
        'eu-accent-80': '#BFB2FF',
        'eu-accent-60': '#D1CCFF',
        'eu-accent-40': '#FAFAFF',

        'eu-error':'#DA1E28',
      },
    },

  },
  plugins: [
    vueformPlugin,
  ]
}