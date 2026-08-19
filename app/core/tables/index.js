import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory } from "../contracts"
import { selectAuth } from "../auth"
import _ from "lodash"

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
  if (!ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(`tables.${ethers.getAddress(address)}`, EMPTY_OBJECT)
}

export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const initTable = async (address) => {
  setLoader(address)
  try {
    await generateContract(address)
    const factory = await getFactory()
    const table = toTable(await factory.getGame(address))
    actions.set(`tables.${table.address}`, table)
  } finally {
    clearLoader(address)
  }
}

export const fetchTables = async () => {
  const { account } = selectAuth()
  if (!account) {
    actions.set("tables", {})
    return
  }

  const factory = await getFactory()
  const rows = await factory.getGamesByCreator(account)
  const tables = _.keyBy(rows.map(toTable), "address")
  actions.set("tables", tables)
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
      const { name: eventName, args = {} } = parsed || {}
      if (eventName === "GameCreated") {
        address = args.game
        break
      }
    } catch {
      // ignore logs from other contracts
    }
  }

  if (!address) throw new Error("GameCreated event not found")

  await initTable(address)
  await fetchTables()
}


const toTable = ({ game, name, createdBy, createdAt, gameType } = {}) => {
  const address = ethers.getAddress(game)
  return {
    address,
    name,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPE_BY_ID[Number(gameType)]
  }
}
