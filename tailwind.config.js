/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [require('daisyui')],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        // Light Blue Shades
        'lightblue-300': '#C4D8E2',
        lightblue: '#ACCBD7',
        'lightblue-600': '#7F9FB0',
        'lightblue-900': '#527284',

        // Dark Blue Shades
        'darkblue-300': '#6E759F',
        darkblue: '#424C5D',
        'darkblue-600': '#303846',
        'darkblue-900': '#1E242F',

        // Orange Shades
        'orange-300': '#E7A376',
        orange: '#DA6E42',
        'orange-600': '#B25636',
        'orange-900': '#8A4229',
      },
      fontFamily: {
        lato: ['Lato', ...defaultTheme.fontFamily.sans],
      },
    },
  },
};
