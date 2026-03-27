import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections for ngrok
    port: 5173,
    allowedHosts: true, // Disable host check for ngrok (security via JWT auth)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    hmr: {
      clientPort: 443, // Use HTTPS port for HMR over ngrok
    },
  },
})
