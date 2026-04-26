/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0e',
        fg: '#f4f4f5',
        muted: '#71717a',
        accent: '#f97316',
      },
    },
  },
  plugins: [],
};
