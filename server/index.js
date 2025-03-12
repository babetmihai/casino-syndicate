const express = require("express")
const app = express()
const PORT = 3000

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" })
})

// Root endpoint
app.get("/", (req, res) => {
  res.send("Server is running")
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

