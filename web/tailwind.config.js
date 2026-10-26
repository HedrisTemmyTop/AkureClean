/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0F766E',
          'teal-light': '#14B8A6',
          'teal-dark': '#115E59',
          green: '#16A34A',
          'green-light': '#4ADE80',
          'green-dark': '#15803D',
        },
        slate: {
          surface: '#FFFFFF',
          bg: '#F8FAFC',
          border: '#E2E8F0',
        },
      },
    },
  },
  plugins: [],
}
