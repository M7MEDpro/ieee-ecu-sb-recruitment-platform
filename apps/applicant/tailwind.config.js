/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ieee: {
          navy: '#023260',
          navyDark: '#011c38',
          navyLight: '#094b8a',
          red: '#D92525',
          redDark: '#b91c1c',
          teal: '#00a1c0',
          tealDark: '#008ba6',
          gold: '#D4AF37',
        },
      },
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
