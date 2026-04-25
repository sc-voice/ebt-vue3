import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { default as EbtConfig } from './ebt-config.mjs'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  base: EbtConfig.basePath,
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['test/test-setup.mjs'],
    include: ['test/**/*.mjs'],
    exclude: ['node_modules', '.git', 'local', 'test/test-setup.mjs', 'test/test-utils.mjs'],
  },
})
