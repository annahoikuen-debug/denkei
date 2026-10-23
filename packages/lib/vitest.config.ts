import macrosPlugin from 'vite-plugin-babel-macros';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [macrosPlugin()],
  test: {
    include: ['**/*.test.ts'],
    pool: 'vmThreads',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['universal/**/*.ts', 'utils/**/*.ts', 'constants/**/*.ts', 'types/**/*.ts', 'errors/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
