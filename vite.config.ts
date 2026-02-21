import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use relative asset paths so the build works whether the site is hosted at
  // /, /<repo>/, or opened from a rewritten URL without a trailing slash.
  base: './',
})
