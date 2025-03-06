import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"


export default defineConfig({
  plugins: [react()],
  publicDir: "./app/public",
  resolve: {
    alias: {
      "app": path.resolve(__dirname, "./app")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined // Ensure no forced chunking interferes
      }
    }
  }
})