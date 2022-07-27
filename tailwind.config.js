/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B33432',
          '50': '#F3D3D3',
          '100': '#EEC3C3',
          '200': '#E5A4A3',
          '300': '#DC8483',
          '400': '#D36563',
          '500': '#CB4543',
          '600': '#B33432',
          '700': '#872726',
          '800': '#5B1B1A',
          '900': '#2F0E0D'
        },
        'secondary': {
          DEFAULT: '#DFBBB1',
          '50': '#F1E1DC',
          '100': '#EBD4CE',
          '200': '#DFBBB1',
          '300': '#CF9889',
          '400': '#BE7661',
          '500': '#A45843',
          '600': '#7D4333',
          '700': '#552E23',
          '800': '#2D1812',
          '900': '#050302'
        },
        "blackish": {
          DEFAULT: '#1E1E1E',
          '50': '#CBCBCB',
          '100': '#C1C1C1',
          '200': '#ADADAD',
          '300': '#989898',
          '400': '#848484',
          '500': '#707070',
          '600': '#5B5B5B',
          '700': '#474747',
          '800': '#323232',
          '900': '#1E1E1E'
        },
        'accent': {
          DEFAULT: '#94BFBE',
          '50': '#FFFFFF',
          '100': '#FAFCFC',
          '200': '#E1EDED',
          '300': '#C7DEDD',
          '400': '#AECECE',
          '500': '#94BFBE',
          '600': '#71AAA9',
          '700': '#558E8D',
          '800': '#406B6A',
          '900': '#2B4847'
        },
      }
    },
  },
  plugins: [],
};
