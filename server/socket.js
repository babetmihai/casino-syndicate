const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")


const useSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*" // Will be updated based on deployment
    }
  })

  io.on("connection", (socket) => {
  // Access the handshake headers
    const token = socket.handshake.headers.authorization?.replace("Bearer ", "")
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const { account } = decoded

    socket.join(account)
    io.to(account).emit("message", {
      message: `Welcome to the casino ${account}`
    })


    socket.on("message", (msg) => {
      console.log("Message:", msg)
    })

    io.on("disconnect", (socket) => {
      socket.leave(account)
    })
  })
}


module.exports = useSocket
