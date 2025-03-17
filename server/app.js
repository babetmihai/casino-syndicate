const express = require("express")
const cors = require("cors")

const authRouter = require("./auth")
const tablesRouter = require("./tables")


const server = express()


server.use(express.json())
server.use(cors())
server.get("/", (req, res) => {
  res.send("Server is running")
})

server.use(authRouter)
server.use(tablesRouter)

server.use((err, req, res, next) => {
  console.log("\n\n")
  console.error(err.stack)
})


module.exports = server