import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev: same-origin /api like production nginx (BLOG_MEDIA_BASE_URL points images at :8083 in local docker).
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, proxy: { '/api': 'http://localhost:8000' } },
})
