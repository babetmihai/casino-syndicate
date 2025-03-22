import client from "../client"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract } from "../contracts"

export const TABLE_TYPES = {
  Roulette: "Roulette"
}


export const selectTable = (address) => actions.get(`tables.${address}`, EMPTY_OBJECT)
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const initTable = async (address) => {
  try {
    setLoader(address)
    const { data: table } = await client.get(`/tables/${address}`)
    await generateContract(address, table.abi)
    actions.set(`tables.${address}`, table)
    return table
  } catch (error) {
    console.error(error)
  } finally {
    clearLoader(address)
  }
}


export const fetchTables = async () => {
  const { data } = await client.get("/tables")
  const tables = data.reduce((acc, table) => {
    acc[table.address] = table
    return acc
  }, {})
  actions.set("tables", tables)
  return tables
}

export const createTable = async (values) => {
  const { name, type } = values
  if (!window.ethereum) throw new Error("Please install MetaMask!")
  await window.ethereum.request({ method: "eth_requestAccounts" })

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const { data: artifact } = await client.get(`/tables/artifact/${type}`)
  const { abi, bytecode } = artifact

  const factory = new ethers.ContractFactory(abi, bytecode, signer)
  const contract = await factory.deploy()
  await contract.waitForDeployment()
  const address = await contract.getAddress()

  const { data: table } = await client.post("/tables", {
    name,
    type,
    abi,
    address
  })
  actions.set(`tables.${address}`, table)
  return table
}

