import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@mediapipe/tasks-vision')) {
            return 'mediapipe'
          }
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react'
          }
          if (id.includes('lucide-react')) {
            return 'lucide'
          }
        },
      },
    },
  },
})


