import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig({
  plugins: [react()],
  root: 'app',
  publicDir: 'app/public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app') // Using 'app' as the new source directory
    }
  },
  build: {
    outDir: '../dist', // Output to the root dist folder instead of app/dist
    emptyOutDir: true
  }
})