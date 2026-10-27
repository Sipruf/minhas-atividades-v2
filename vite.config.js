import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Base relativa: funciona no GitHub Pages em qualquer subcaminho.
  base: './',
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
})
