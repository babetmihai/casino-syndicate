/* eslint-disable */
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"


export default defineConfig({
  envDir: path.resolve(__dirname, ".."),
  plugins: [react(), tailwindcss()],
  publicDir: "./app/public",
  resolve: {
    alias: {
      "app": path.resolve(__dirname, "./app"),
      "artifacts": path.resolve(__dirname, "../blockchain/artifacts")
    }
  },
  server: {
    port: 3001
  }
})
