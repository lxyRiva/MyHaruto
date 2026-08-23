/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        haruto: {
          sea: '#3d7ea6', // 海蓝：Haruto 留言与强调色
        },
      },
    },
  },
  plugins: [],
}
