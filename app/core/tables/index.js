import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory, sendWalletTx } from "../contracts"
import { selectAuth } from "../auth"
import { fetchRoulette } from "app/games/roulette"
import { fetchPolygons } from "app/games/polygons"
import { ensureBlackjackDeck, fetchBlackjack } from "app/games/blackjack"
import { parseEth } from "app/games/roulette/chips"
import history from "../history"
import BlackjackArtifact from "artifacts/contracts/Blackjack.sol/Blackjack.json"
import PolygonsArtifact from "artifacts/contracts/Polygons.sol/Polygons.json"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import _ from "lodash"

export const TABLE_TYPES = {
  Roulette: "Roulette",
  Polygons: "Polygons",
  Blackjack: "Blackjack"
}

export const TABLE_TYPE_IDS = {
  [TABLE_TYPES.Roulette]: 0,
  [TABLE_TYPES.Polygons]: 1,
  [TABLE_TYPES.Blackjack]: 2
}

const TABLE_TYPE_BY_ID = {
  0: TABLE_TYPES.Roulette,
  1: TABLE_TYPES.Polygons,
  2: TABLE_TYPES.Blackjack
}


export const selectTable = (address) => {
  if (!address) return EMPTY_OBJECT
  if (!ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(`tables.${ethers.getAddress(address)}`, EMPTY_OBJECT)
}

export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const initTable = async (address) => {
  if (!address || !ethers.isAddress(address)) {
    history.push("/")
    return
  }
  setLoader(address)
  try {
    const factory = await getFactory()
    const table = toTable(await factory.getGame(address))
    actions.set(`tables.${table.address}`, table)
    await generateContract(address, abiForType(table.type))
  } catch (error) {
    const text = `${error.shortMessage || ""} ${error.reason || ""} ${error.message || ""}`
    const missing = text.includes("Unknown game") || text.includes("Contract is not deployed")
    if (missing) history.push("/")
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
    if (table.type === TABLE_TYPES.Polygons) return fetchPolygons(table.address)
    if (table.type === TABLE_TYPES.Blackjack) return fetchBlackjack(table.address)
    return fetchRoulette(table.address)
  }))
}

export const createTable = async (values) => {
  const { type, balance, minBet, maxBet, polygonCount, ticketPrice } = values
  const gameType = TABLE_TYPE_IDS[type]
  if (gameType === undefined) throw new Error("Unsupported game type")

  const factory = await getFactory()
  const isPolygons = type === TABLE_TYPES.Polygons
  let args = [gameType, parseEth(minBet), parseEth(maxBet), 0]
  const value = parseEth(balance)
  if (isPolygons) {
    args = [gameType, polygonCount, 0, parseEth(ticketPrice)]
  }
  const receipt = await sendWalletTx(factory.createGame, args, { value })

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
  if (type === TABLE_TYPES.Blackjack) await ensureBlackjackDeck(address)
  await fetchTables()
}

const abiForType = (type) => {
  if (type === TABLE_TYPES.Polygons) return PolygonsArtifact.abi
  if (type === TABLE_TYPES.Blackjack) return BlackjackArtifact.abi
  return RouletteArtifact.abi
}

const toTable = ({ game, createdBy, createdAt, gameType } = {}) => {
  const address = ethers.getAddress(game)
  return {
    address,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPE_BY_ID[Number(gameType)]
  }
}
