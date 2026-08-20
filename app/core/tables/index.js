import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory, sendTx } from "../contracts"
import { selectAuth } from "../auth"
import { fetchRoulette } from "app/games/roulette"
import { fetchLottery, parseChance } from "app/games/lottery"
import { parseEth } from "app/games/roulette/chips"
import LotteryArtifact from "artifacts/contracts/Lottery.sol/Lottery.json"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import _ from "lodash"

export const TABLE_TYPES = {
  Roulette: "Roulette",
  Lottery: "Lottery"
}

export const TABLE_TYPE_IDS = {
  [TABLE_TYPES.Roulette]: 0,
  [TABLE_TYPES.Lottery]: 1
}

const TABLE_TYPE_BY_ID = {
  0: TABLE_TYPES.Roulette,
  1: TABLE_TYPES.Lottery
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
    const factory = await getFactory()
    const table = toTable(await factory.getGame(address))
    actions.set(`tables.${table.address}`, table)
    await generateContract(address, abiForType(table.type))
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
  await Promise.all(_.map(tables, (table) => {
    if (table.type === TABLE_TYPES.Lottery) return fetchLottery(table.address)
    return fetchRoulette(table.address)
  }))
}

export const createTable = async (values) => {
  const { name, type, balance, minBet, maxBet, polygonCount, winPercent, ticketPrice } = values
  const gameType = TABLE_TYPE_IDS[type]
  if (gameType === undefined) throw new Error("Unsupported game type")

  const factory = await getFactory()
  const isLottery = type === TABLE_TYPES.Lottery
  let args = [name, gameType, parseEth(minBet), parseEth(maxBet), 0]
  let value = parseEth(balance)
  if (isLottery) {
    args = [name, gameType, polygonCount, parseChance(winPercent), parseEth(ticketPrice)]
    value = 0n
  }
  const receipt = await sendTx(factory.createGame, args, { value })

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

export const setTableName = async (address, name) => {
  const factory = await getFactory()
  await sendTx(factory.setGameName, [address, name])
  await initTable(address)
}


const abiForType = (type) => {
  if (type === TABLE_TYPES.Lottery) return LotteryArtifact.abi
  return RouletteArtifact.abi
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
