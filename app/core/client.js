import axios from "axios"
import { selectAccount } from "./account"


const { VITE_SERVER_URL } = import.meta.env

const client = axios.create({
  baseURL: VITE_SERVER_URL,
  interceptors: {
    request: {
      use: (config) => {
        const account = selectAccount()
        if (account) {
          config.headers.Authorization = `Bearer ${account}`
        }
        return config
      }
    }
  }
})

export default client