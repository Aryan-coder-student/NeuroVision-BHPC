import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.localtest.me', '.lvh.me', '.localhost', 'localhost'],
    port: 5174,
    strictPort: true,
  }
})
