// v1.0: Tailwind configuration aligning with Purdue color palette and project paths.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        campusGold: '#C28E0E',
        athleticGold: '#CEB888',
        purdueBlack: '#000000',
        purdueGray: '#9D968D',
        purdueDarkGray: '#373A36',
      },
    },
  },
  plugins: [],
};
