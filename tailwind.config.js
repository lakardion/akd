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
        accent: "#DFEFCA",
        accentSecondary: "#CCDDD3"
      }
    },
  },
  plugins: [],
};
