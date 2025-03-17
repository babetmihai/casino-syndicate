import React from "react"
import { selectAuth } from "./auth"
import { useSelector } from "react-redux"
import io from "socket.io-client"

const { VITE_SERVER_URL } = import.meta.env


export const useSocket = (address, callback) => {
  const { token } = useSelector(() => selectAuth())
  const [socket, setSocket] = React.useState(null)
  React.useEffect(() => {
    if (token && address) {
      const socket = io(VITE_SERVER_URL, {
        query: { address },
        extraHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
      socket.on("connect", () => {
        console.log("Connected to server")
      })

      socket.on("message", (msg) => {
        console.log(msg)
        callback(msg)
      })

      setSocket(socket)
      return () => {
        socket.disconnect()
      }
    }
  }, [token, address])
  return socket
}