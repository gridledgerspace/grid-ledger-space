/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#050b14', // Глибокий космос (фон)
          900: '#0a1628', // Панелі інтерфейсу
          800: '#112240', // Активні елементи
        },
        neon: {
          cyan: '#00f0ff', // Основний (Щити, Сканер)
          blue: '#00a8ff',
          orange: '#ffae00', // Акцент (Халл, Лазер)
          red: '#ff2a2a',   // Небезпека
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #112240 1px, transparent 1px), linear-gradient(to bottom, #112240 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}