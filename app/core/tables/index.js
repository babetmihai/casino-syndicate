import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory } from "../contracts"
import { selectAuth } from "../auth"

export const TABLE_TYPES = {
  Roulette: "Roulette"
}

export const TABLE_TYPE_IDS = {
  [TABLE_TYPES.Roulette]: 0
}

const TABLE_TYPE_BY_ID = {
  0: TABLE_TYPES.Roulette
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


const toTable = ({ game, name, createdBy, createdAt, gameType }) => {
  const address = ethers.getAddress(game)
  return {
    address,
    name,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPE_BY_ID[Number(gameType)]
  }
}


export const initTable = async (address) => {
  try {
    setLoader(address)
    await generateContract(address)
    const factory = await getFactory()
    const table = toTable(await factory.getGame(address))
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
    const rows = await factory.getGamesByCreator(account)
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
  const { name, type } = values
  const gameType = TABLE_TYPE_IDS[type]
  if (gameType === undefined) throw new Error("Unsupported game type")

  const factory = await getFactory()
  const tx = await factory.createGame(name, gameType)
  const receipt = await tx.wait()

  let address
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log)
      if (parsed?.name === "GameCreated") {
        address = parsed.args.game
        break
      }
    } catch {
      // ignore logs from other contracts
    }
  }

  if (!address) throw new Error("GameCreated event not found")

  const table = await initTable(address)
  await fetchTables()
  return table
}
