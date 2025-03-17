const dotenv = require("dotenv")
dotenv.config()

const server = require("./socket")

const { SERVER_PORT } = process.env
server.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`)
})
