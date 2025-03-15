import axios from "axios"
import { selectAuth } from "./auth"


const { VITE_SERVER_URL } = import.meta.env

const client = axios.create({
  baseURL: VITE_SERVER_URL
})

client.interceptors.request.use(
  (config) => {
    const { token } = selectAuth()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default client