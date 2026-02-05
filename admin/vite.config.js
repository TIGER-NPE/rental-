import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'
  
  return {
    plugins: [react()],
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(
        isProd ? '' : (env.VITE_API_URL || 'http://localhost:3000/api')
      )
    }
  }
})
