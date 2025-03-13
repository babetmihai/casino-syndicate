import client from "../client"
import { actions } from "../store"
import { useSelector } from "react-redux"
import React from "react"
import { EMPTY_OBJECT } from ".."
import _ from "lodash"
import { ethers } from "ethers"


const TABLE_TYPES = {
  Roulette: "Roulette"
}

export const selectTable = (address) => actions.get(`tables.${address}`, EMPTY_OBJECT)
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const useTable = (address) => {
  const table = useSelector(() => selectTable(address))
  React.useEffect(() => {
    if (address && _.isEmpty(table)) fetchTable(address)
  }, [address])
  return [table]
}

const fetchTable = async (address) => {
  const { data } = await client.get(`/tables/${address}`)
  actions.set(`tables.${address}`, data)
  return data
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

}


export const useContract = (address, abi) => {
  const contract = useSelector(() => selectContract(address))
  React.useEffect(() => {
    if (address && abi && !contract) initContract(address, abi)
  }, [address])

  return [contract]
}


export const selectContract = (address) => actions.get(`contracts.${address}`)
const initContract = async (address, abi) => {
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


export const selectTableData = (id) => actions.get(`tableData.${id}`, EMPTY_OBJECT)
export const fetchTableData = async (id) => {
  const table = selectTable(id)
  const { address } = table
  const contract = selectContract(address)
  const data = await contract.getTable()
  const TABLE_DATA_FIELDS = ["memberShares", "playerBalance", "totalBalance", "totalShares"]
  const formattedData = TABLE_DATA_FIELDS.reduce((acc, field) => {
    acc[field] = ethers.formatEther(data[field])
    return acc
  }, {})
  actions.set(`tableData.${id}`, formattedData)
  return formattedData
}

