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
    if (item) acc[item.id] = item
    return acc
  }, {})
  actions.set("tables", tables)
  return tables
}


export const fetchTableInfo = async (id) => {
  const contract = selectContract()
  const { table, member } = await contract.getTableInfo(id)
  const item = toTableItem(table)
  if (!item) throw new Error("table_not_found")
  actions.set(`tables.${id}`, item)
  return item
}


export const createTables = async ({ name, balance }) => {
  const contract = selectContract()
  const tx = await contract.createTable(name, {
    value: ethers.parseEther(balance.toString())
  })
  await tx.wait()
  await fetchTables()
}


const toTableItem = (table) => {
  if (table.id) {
    return {
      id: table.id.toString(),
      name: table.name
    }
  }

}