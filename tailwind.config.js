/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mc-red': '#db0007',
        'mc-yellow': '#ffbc0d',
      }
    },
  },
  plugins: [],
}