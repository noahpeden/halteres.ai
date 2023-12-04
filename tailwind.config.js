/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: '#4b5563', // A dark slate gray
          secondary: '#ADCCD8', // A light, airy blue
          accent: '#f97316', // A bright, vibrant orange

          neutral: '#F3F4F6', // A very light gray for a neutral look
          'base-100': '#ffffff', // Pure white for base elements

          info: '#3ABFF8', // A bright blue, good for informational elements
          success: '#22C55E', // A crisp green, indicating success or completion
          warning: '#EAB308', // A warm yellow, suitable for warnings
          error: '#EF4444', // A strong red for error messages
        },
      },
    ],
  },
};
