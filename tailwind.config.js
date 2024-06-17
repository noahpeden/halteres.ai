/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        gallery: '#f9fbff',
        pampas: '#f5f4f0',
        'website-blue': '#deebfd',
        'error-red': '#e74444',
        'success-green': '#188038',
        'smart-blue': {
          DEFAULT: '#1771dc',
          primary: '#1771dc',
          1: '#134e93',
          2: '#1a61b5',
          3: '#3682de',
          4: '#a5ceff',
        },
        'helpful-orange': {
          DEFAULT: '#ea7f49',
          primary: '#ea7f49',
          1: '#a75932',
          2: '#c06e44',
          3: '#ed9264',
          4: '#ffd2bb',
        },
        'thriving-green': {
          DEFAULT: '#3c8f73',
          primary: '#3c8f73',
          1: '#2d6955',
          2: '#3d846c',
          3: '#65a790',
          4: '#bfe8d9',
        },
        'never-preachy-peach': {
          DEFAULT: '#ffcc7b',
          primary: '#ffcc7b',
          1: '#bf9147',
          2: '#ddad61',
          3: '#ffd592',
          4: '#ffeed3',
        },
        'practical-gray': {
          DEFAULT: '#6f879a',
          primary: '#6f879a',
          1: '#35546c',
          2: '#526f86',
          3: '#7995a9',
          4: '#c4d1db',
        },
        black: {
          1: '#121212',
          2: '#383838',
          3: '#606060',
          4: '#808080',
        },
        grayscale: {
          1: '#9e9e9e',
          2: '#cacdd4',
          3: '#eaebed',
          4: '#f3f4f5',
        },
      },
      opacity: {
        8: '0.08',
      },
      spacing: {
        128: '32rem',
        144: '36rem',
        150: '37.5rem',
        160: '40rem',
      },
    },
    fontFamily: {
      body: ['var(--font-nunito-sans'],
      sans: ['var(--font-poppins)'],
    },
    screens: {
      xs: '25rem',
      sm: '37.5rem',
      md: '50.5rem',
      lg: '64rem',
      xl: '80.5rem',
      '2xl': '87.5rem',
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#1771dc', // smart-blue
          secondary: '#ea7f49', // helpful-orange
          accent: '#3c8f73', // thriving-green
          neutral: '#6f879a', // practical-gray
          'base-100': '#ffffff', // white
          info: '#deebfd', // website-blue
          success: '#188038', // success-green
          warning: '#ffcc7b', // never-preachy-peach
          error: '#e74444', // error-red
          '--btn-primary': '#1771dc',
          '--btn-primary-text': '#ffffff',
          '--rounded-box': '1rem', // Default rounded box (optional)
          '--rounded-btn': '0.5rem', // Default rounded button (optional)
          '--rounded-badge': '1.9rem', // Default rounded badge (optional)
        },
      },
    ],
    utils: true, // adds responsive and modifier utility classes
    prefix: '', // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    themeRoot: ':root',
  },
};
