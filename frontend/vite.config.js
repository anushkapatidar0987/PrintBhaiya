import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['better-jokes-peel.loca.lt', 'localhost', 'upccg-2401-4900-1ca3-6812-710c-a25e-169d-8951.free.pinggy.net', 'ehphs-2401-4900-1ca3-6812-710c-a25e-169d-8951.run.pinggy-free.link'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
