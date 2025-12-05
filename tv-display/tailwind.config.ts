import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../shared/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      defaultTheme: 'light',
      defaultExtendTheme: 'light',
      themes: {
        light: {
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
              foreground: '#ffffff',
            },
            danger: {
              50: '#ffe6e6',
              100: '#ffb3b3',
              200: '#ff8080',
              300: '#ff4d4d',
              400: '#ff1a1a',
              500: '#dc2626',
              600: '#b31e1e',
              700: '#8a1717',
              800: '#610f0f',
              900: '#380808',
              DEFAULT: '#dc2626',
              foreground: '#ffffff',
            },
            success: {
              50: '#e2f8ec',
              100: '#b9efd1',
              200: '#91e5b5',
              300: '#68dc9a',
              400: '#40d27f',
              500: '#17c964',
              600: '#13a653',
              700: '#0f8341',
              800: '#0b5f30',
              900: '#073c1e',
              DEFAULT: '#17c964',
              foreground: '#000000',
            },
          },
          layout: {
            disabledOpacity: '0.2',
          },
        },
      },
    }),
  ],
};

export default config;
