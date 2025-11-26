import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f3ff',
          100: '#b3daff',
          200: '#80c1ff',
          300: '#4da8ff',
          400: '#1a8fff',
          500: '#007fff',
          600: '#0066cc',
          700: '#004d99',
          800: '#003366',
          900: '#001a33',
          DEFAULT: '#007fff',
        },
        success: {
          DEFAULT: '#00b847',
          50: '#e6f9ed',
          100: '#b3ecc9',
          500: '#00b847',
          600: '#009339',
        },
        danger: {
          DEFAULT: '#dc2626',
          50: '#ffe6e6',
          100: '#ffb3b3',
          500: '#dc2626',
          600: '#b31e1e',
        },
        warning: {
          DEFAULT: '#ffc107',
          50: '#fffce6',
          100: '#fff5b3',
          500: '#ffc107',
          600: '#cc9a00',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        'touch': '56px',
      },
      minWidth: {
        'touch': '56px',
      },
    },
  },
  plugins: [],
};

export default config;
