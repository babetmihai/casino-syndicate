const WebSocket = require("ws")
const jwt = require("jsonwebtoken")

// Create a WebSocket server
const wss = new WebSocket.Server({
  port: process.env.WS_PORT
})

wss.on("connection", (ws) => {
  console.log("Client connected")
  // authenticate the client
  const authHeader = ws.upgradeReq.headers.authorization
  const token = authHeader?.replace("Bearer ", "")
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  // can i receive some data from the client?
  // get initial connection data from the client
  const { account } = decoded

  // send a welcome message to the client
  ws.send("Hello from the server!")



  // Echo back any message received
  ws.on("message", (message) => {
    const data = JSON.parse(message.toString())
    const {  } = data

    ws.send(`Echo: ${message}`)
  })

  // Handle client disconnect
  ws.on("close", () => {
    console.log("Client disconnected") 
  })
})

console.log("WebSocket server running on ws://localhost:8080")

