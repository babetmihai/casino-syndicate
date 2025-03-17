const dotenv = require("dotenv")
dotenv.config()
const express = require("express")
const cors = require("cors")
const useSocket = require("./socket")
const { createServer } = require("http")

const authRouter = require("./auth")
const tablesRouter = require("./tables")


const app = express()
const httpServer = createServer(app)


app.use(express.json())
app.use(cors())
app.get("/", (req, res) => {
  res.send("Server is running")
})

app.use(authRouter)
app.use(tablesRouter)

app.use((err, req, res, next) => {
  console.log("\n\n")
  console.error(err.stack)
})


const { SERVER_PORT } = process.env

useSocket(httpServer)
httpServer.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`)
})
