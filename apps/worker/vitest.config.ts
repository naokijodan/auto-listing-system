import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/processors/**/*.ts'],
      exclude: ['src/test/**', '**/*.d.ts'],
    },
    testTimeout: 30000,
    deps: {
      inline: [/@rakuda\/.*/],
    },
  },
  resolve: {
    alias: {
      '@rakuda/database': path.resolve(__dirname, '../../packages/database/src'),
      '@rakuda/logger': path.resolve(__dirname, '../../packages/logger/src'),
      '@rakuda/config': path.resolve(__dirname, '../../packages/config/src'),
      '@rakuda/schema': path.resolve(__dirname, '../../packages/schema/src'),
    },
  },
});
