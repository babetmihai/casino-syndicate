const dotenv = require("dotenv")
dotenv.config()
const express = require("express")
const cors = require("cors")


const authRouter = require("./auth")
const tablesRouter = require("./tables")


const { VITE_SERVER_PORT } = process.env


const app = express()
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

app.listen(VITE_SERVER_PORT, () => {
  console.log(`Server is running on port ${VITE_SERVER_PORT}`)
})

