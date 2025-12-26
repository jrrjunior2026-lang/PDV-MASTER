import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
})
