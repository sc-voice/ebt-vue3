import { defineConfig } from '@sc-voice/vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/test-setup.mjs'],
    include: ['test/**/*.mjs'],
    exclude: ['test/vitest.config.mjs', 'test/test-setup.mjs', 'test/test-utils.mjs'],
  },
});
