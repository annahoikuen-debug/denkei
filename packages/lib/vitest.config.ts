import macrosPlugin from 'vite-plugin-babel-macros';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [macrosPlugin()],
  test: {
    include: ['**/*.test.ts'],
    pool: 'vmThreads',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text'],
      reportOnFailure: true,
      include: ['**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/node_modules/**',
        '**/coverage/**',
        '**/.vitest/**',
        '**/vitest.config.ts',
        '**/vitest.setup.ts',
      ],
      // NOTE: v8 provider + vmThreads pool の制約により TypeScript ファイルの
      // カバレッジが正確に計測されない（0% 表示となる既知問題）。
      // 閾値は意図的に無効化中。provider を istanbul に戻すか pool を threads に
      // 変更した際に thresholds: { lines: 80, ... } を再導入すること。
    },
  },
});
