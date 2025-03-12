import axios from "axios"


const { VITE_SERVER_URL } = import.meta.env

const client = axios.create({
  baseURL: VITE_SERVER_URL
})

export default client