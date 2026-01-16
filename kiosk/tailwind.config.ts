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
    extend: tailwindExtend,
  },
  darkMode: 'class',
  plugins: [
    heroui(sentinelTheme),
  ],
};

export default config;
