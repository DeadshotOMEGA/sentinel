/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007fff',
          50: '#e6f3ff',
          100: '#cce7ff',
          600: '#0066cc',
        },
        success: {
          DEFAULT: '#00c875',
          50: '#e6f9f2',
          100: '#ccf3e5',
          600: '#00a661',
        },
        danger: {
          DEFAULT: '#e44258',
          50: '#fceef0',
          100: '#f9dde1',
        },
        warning: {
          DEFAULT: '#ff8000',
          50: '#fff3e6',
          100: '#ffe7cc',
          600: '#cc6600',
        },
      },
      minHeight: {
        touch: '56px',
      },
      minWidth: {
        touch: '56px',
      },
    },
  },
  plugins: [],
}

