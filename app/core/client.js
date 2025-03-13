import axios from "axios"
import { selectAccount } from "./account"


const { VITE_SERVER_URL } = import.meta.env

const client = axios.create({
  baseURL: VITE_SERVER_URL
})

client.interceptors.request.use(
  (config) => {
    const account = selectAccount()
    if (account) {
      config.headers.Authorization = `Bearer ${account}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default client