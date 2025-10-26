/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-tomato',
    'hover:bg-red-600', 
    'text-tomato',
    'bg-peach',
    'bg-peachLight',
    'bg-peachDark',
    'text-peachDark',
    'border-peach',
    'focus:border-peach',
    'focus:ring-peach',
    'hover:bg-peach',
    'hover:bg-peachDark'
  ],
  theme: {
    extend: {
      colors: {
        'primary':'#f9f7f3',
        'secondary': '#1b2629',
        'btnColor': '#9c702a',
        'peach': '#FFCBA4',
        'lightOrange': '#FF6347',
        'peachLight': '#FFF2E6',
        'peachDark': '#FF9F66',
        'tomato': '#FF6347',

      }
    },
  },
  plugins: [],
}



