const WebSocket = require("ws")
const jwt = require("jsonwebtoken")

// Connect to the server
const ws = new WebSocket("ws://localhost:8080")
// Generate a JWT token
const token = jwt.sign({ username: "user" }, "your-secret-key", { expiresIn: "1h" })

ws.on("open", () => {
  console.log("Connected to server")
  // Send login message with JWT token
  ws.send(JSON.stringify({ type: "login", token }))
})

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