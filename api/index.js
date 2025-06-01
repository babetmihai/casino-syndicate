const dotenv = require("dotenv")
dotenv.config()

const express = require("express")
const cors = require("cors")

const authController = require("./controllers/auth")
const tablesController = require("./controllers/tables")


const server = express()

server.use(express.json())
server.use(cors())
server.get("/", (req, res) => {
  res.send("Server is running")
})

server.use(authController)
server.use(tablesController)


server.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})


module.exports = server