import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { ethers } from "ethers"
import { clearLoader, setLoader } from "../loaders"
import { generateContract, getFactory } from "../contracts"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"

export const TABLE_TYPES = {
  Roulette: "Roulette"
}

const TABLE_TYPE_BY_ID = {
  0: TABLE_TYPES.Roulette
}

export const tablesActions = actions.create("tables")
export const tableActions = (address) => tablesActions.create(() => ethers.getAddress(address))


export const selectTable = (address) => {
  if (!address) return EMPTY_OBJECT
  if (!ethers.isAddress(address)) return EMPTY_OBJECT
  return tableActions(address).get()
}


export const initTable = async (address) => {
  if (!address || !ethers.isAddress(address)) return
  setLoader(address)
  try {
    const factory = await getFactory()
    const table = toTable(await factory.getGame(address))
    tableActions(address).set(table)
    await generateContract(address, RouletteArtifact.abi)
  } catch (error) {
    const text = `${error.shortMessage || ""} ${error.reason || ""} ${error.message || ""}`
    const missing = text.includes("Unknown game") || text.includes("Contract is not deployed")
    if (!missing) throw error
  } finally {
    clearLoader(address)
  }
}

const toTable = ({ game, createdBy, createdAt, gameType } = {}) => {
  const address = ethers.getAddress(game)
  return {
    id: address,
    address,
    createdBy: ethers.getAddress(createdBy),
    createdAt: Number(createdAt),
    type: TABLE_TYPE_BY_ID[Number(gameType)]
  }
}
