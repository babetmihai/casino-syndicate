import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig({
  plugins: [react()],
  publicDir: './app/public',
  build: {
    outDir: '../dist', // Output to the root dist folder
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app')
    }
  }
})