import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';
import { sentinelTheme, tailwindExtend } from '../shared/ui/theme';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../shared/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      ...tailwindExtend,
      // TV-specific pulse animations for border alerts
      keyframes: {
        ...tailwindExtend.keyframes,
        'pulse-border-red': {
          '0%, 100%': {
            borderColor: '#dc2626',
            boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)',
          },
          '50%': {
            borderColor: '#f87171',
            boxShadow: '0 0 20px 8px rgba(220, 38, 38, 0.4)',
          },
        },
        'pulse-border-yellow': {
          '0%, 100%': {
            borderColor: '#f59e0b',
            boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)',
          },
          '50%': {
            borderColor: '#fcd34d',
            boxShadow: '0 0 20px 8px rgba(245, 158, 11, 0.4)',
          },
        },
      },
      animation: {
        ...tailwindExtend.animation,
        'pulse-border-red': 'pulse-border-red 1.5s ease-in-out infinite',
        'pulse-border-yellow': 'pulse-border-yellow 1.5s ease-in-out infinite',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui(sentinelTheme),
  ],
};

export default config;
