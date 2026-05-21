import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/events': {
        target: 'http://ec2-3-27-62-158.ap-southeast-2.compute.amazonaws.com',
        changeOrigin: true,
      },
    },
  },
})