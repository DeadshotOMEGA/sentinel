import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007fff',
        accent: '#ff8000',
        success: '#10b981',
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        '176': '44rem',
        '192': '48rem',
        '208': '52rem',
        '224': '56rem',
        '240': '60rem',
        '256': '64rem',
      },
      fontSize: {
        'tv-xs': '1.25rem',
        'tv-sm': '1.5rem',
        'tv-base': '2rem',
        'tv-lg': '2.5rem',
        'tv-xl': '3rem',
        'tv-2xl': '4rem',
        'tv-3xl': '5rem',
        'tv-4xl': '6rem',
      },
    },
  },
  plugins: [],
} satisfies Config
