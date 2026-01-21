import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // Run test files sequentially to avoid Testcontainers conflicts
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/index.ts',
        'tests/**/*',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
  server: {
    deps: {
      // Externalize native modules to prevent Vite from trying to bundle them
      inline: [/@sentinel\/.*/],
      external: ['pg', '@prisma/adapter-pg', '@prisma/client', 'prisma', '.prisma/client'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sentinel/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@sentinel/database': path.resolve(__dirname, '../../packages/database/src'),
      '@sentinel/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@prisma/client', '@prisma/adapter-pg', 'prisma', '.prisma/client'],
  },
})
