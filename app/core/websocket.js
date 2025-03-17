const WebSocket = require("ws")
const jwt = require("jsonwebtoken")

// Connect to the server
const ws = new WebSocket(import.meta.env.VITE_WS_URL)



ws.on("open", () => {
  console.log("Connected to server")
  // Send a test message
  ws.send("Hey server, what’s up?")
})

ws.on("message", (data) => {
  console.log("Received:", data.toString())
})

ws.on("close", () => {
  console.log("Disconnected from server")
})

ws.on("error", (error) => {
  console.error("Error:", error)
})