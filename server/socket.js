const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")

const { JWT_SECRET } = process.env

const useSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*" // Will be updated based on deployment
    }
  })

  io.on("connection", (socket) => {
  // Access the handshake headers
    const { headers, query } = socket.handshake
    const { authorization } = headers
    const { address } = query

    const token = authorization?.replace("Bearer ", "")
    const { account } = jwt.verify(token, JWT_SECRET)

    socket.join(address)
    io.to(address).emit("message", {
      message: `Welcome to the casino ${address}`
    })
    socket.emit("message", {
      message: `User ${account}`
    })

    socket.on("message", (msg) => {
      console.log("Message:", msg)
    })

    io.on("disconnect", (socket) => {
      socket.leave(address)
    })
  })
}


module.exports = {
  useSocket
}

