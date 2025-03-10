/* eslint-disable */
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
  server: {
    watch: {
      include: ["./app/public/**"],
      usePolling: true,
      interval: 100 // 1 second delay between file change detection
    },
  }
})