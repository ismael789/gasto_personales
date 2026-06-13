/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
      },
      colors: {
        brand: {
          DEFAULT: '#2E4053',
          dark: '#1A252F',
          light: '#E8F0F6'
        },
        accent: {
          DEFAULT: '#6C63FF',
          soft: '#EDEBFF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Helvetica', 'Arial']
      }
    },
  },
  plugins: [],
}