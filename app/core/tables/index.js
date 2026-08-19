import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory } from "../contracts"
import { selectAuth } from "../auth"

export const TABLE_TYPES = {
  Roulette: "Roulette"
}


export const selectTable = (address) => {
  if (!address) return EMPTY_OBJECT
  try {
    return actions.get(`tables.${ethers.getAddress(address)}`, EMPTY_OBJECT)
  } catch {
    return EMPTY_OBJECT
  }
}
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


const toTable = ({ table, name, createdBy, createdAt }) => {
  const address = ethers.getAddress(table)
  return {
    address,
    name,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPES.Roulette
  }
}


export const initTable = async (address) => {
  try {
    setLoader(address)
    const contract = await generateContract(address)
    const [name, createdBy, createdAt] = await Promise.all([
      contract.name(),
      contract.createdBy(),
      contract.createdAt()
    ])
    const table = toTable({ table: address, name, createdBy, createdAt })
    actions.set(`tables.${table.address}`, table)
    return table
  } catch (error) {
    console.error(error)
  } finally {
    clearLoader(address)
  }
}


export const fetchTables = async () => {
  const { account } = selectAuth()
  if (!account) {
    actions.set("tables", {})
    return {}
  }

  try {
    const factory = await getFactory()
    const rows = await factory.getTablesByCreator(account)
    const tables = rows.reduce((acc, row) => {
      const table = toTable(row)
      acc[table.address] = table
      return acc
    }, {})
    actions.set("tables", tables)
    return tables
  } catch (error) {
    console.error(error)
    actions.set("tables", {})
    return {}
  }
}

export const createTable = async (values) => {
  const { name } = values
  const factory = await getFactory()
  const tx = await factory.createTable(name)
  const receipt = await tx.wait()

  let address
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log)
      if (parsed?.name === "TableCreated") {
        address = parsed.args.table
        break
      }
    } catch {
      // ignore logs from other contracts
    }
  }

  if (!address) throw new Error("TableCreated event not found")

  const table = await initTable(address)
  await fetchTables()
  return table
}
