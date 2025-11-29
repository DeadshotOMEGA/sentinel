import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@sentinel/ui': path.resolve(__dirname, '../shared/ui'),
    },
  },
  server: {
    port: 5175,
    host: '0.0.0.0',
  },
})
