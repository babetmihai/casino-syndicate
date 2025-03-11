import { EMPTY_OBJECT } from ".."
import { actions } from "../store"
import { selectContract } from "../wallet"
import { ethers } from "ethers"


export const selectTables = () => actions.get("tables", EMPTY_OBJECT)
export const selectTable = (id) => actions.get(`tables.${id}`, EMPTY_OBJECT)


export const fetchTables = async () => {
  const contract = selectContract()
  const res = await contract.getTables()
  const tables = res.reduce((acc, table) => {
    const item = toTableItem(table)
    acc[item.id] = item
    return acc
  }, {})
  actions.set("tables", tables)
  return tables
}


export const fetchTable = async (id) => {
  const contract = selectContract()
  const res = await contract.getTable(id)
  const table = toTableItem(res)
  actions.set(`tables.${id}`, table)
  return table
}


export const createTable = async ({ name, balance }) => {
  const contract = selectContract()
  const tx = await contract.createTable(name, {
    value: ethers.parseEther(balance.toString())
  })
  await tx.wait()
  await fetchTables()
}


const toTableItem = (table) => {
  return {
    id: table.id.toString(),
    name: table.name
  }
}