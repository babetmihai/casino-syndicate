import client from "../client"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"


export const TABLE_TYPES = {
  Roulette: "Roulette"
}

export const selectTable = (address) => actions.get(`tables.${address}`, EMPTY_OBJECT)
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)
export const selectContract = (address) => actions.get(`contracts.${address}`)


export const initTable = async (address) => {
  const table = await fetchTable(address)
  await generateContract(address, table.abi)
}


const fetchTable = async (address) => {
  const { data: table } = await client.get(`/tables/${address}`)
  actions.set(`tables.${address}`, table)
  return table
}

const generateContract = async (address, abi) => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  let retries = 5
  while (retries > 0) {
    const code = await provider.getCode(address)
    if (code !== "0x") break
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
    retries--
  }
  const contract = new ethers.Contract(address, abi, signer)
  actions.set(`contracts.${address}`, contract)
  return contract
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

  const { data: artifact } = await client.get(`/contract-artifact/${type}`)
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

