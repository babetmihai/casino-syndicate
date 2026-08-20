import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import LotteryArtifact from "artifacts/contracts/Lottery.sol/Lottery.json"
import _ from "lodash"

export const MIN_POLYGONS = 3
export const MAX_POLYGONS = 48
export const MIN_CHANCE = 0.01
export const MAX_CHANCE = 100
export const CHANCE_SCALE = 100

export const parseChance = (percent) => {
  const bps = _.round((Number(percent) || 0) * CHANCE_SCALE)
  return _.clamp(bps, 1, MAX_CHANCE * CHANCE_SCALE)
}

export const formatChance = (bps) => _.round(Number(bps || 0) / CHANCE_SCALE, 2)

export const chanceLabel = (percent) => `${_.round(Number(percent) || 0, 2)}%`
export const TICKET_GAS = 2000000n


const lotteryPath = (address) => `games.lottery.${ethers.getAddress(address)}`


export const selectLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(lotteryPath(address), EMPTY_OBJECT)
}

export const fetchLottery = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, LotteryArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const owners = _.map(row.owners || [], (item) => {
    if (!item || item === ethers.ZeroAddress) return null
    return ethers.getAddress(item)
  })
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const tableAddress = ethers.getAddress(address)
  actions.update(lotteryPath(address), {
    polygonCount: Number(row.polygonCount),
    winPercent: formatChance(row.winPercent),
    ticketPrice: formatEth(row.ticketPrice),
    claimedCount: Number(row.claimedCount),
    prize: formatEth(row.prize),
    myPrize: formatEth(row.myPrize),
    owner,
    owners
  })
  if (owner) {
    actions.update(`tables.${tableAddress}`, { createdBy: owner })
  }
}

export const buyLotteryTicket = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, LotteryArtifact.abi)
  const { ticketPrice } = selectLottery(address)
  const receipt = await sendTx(contract.buyTicket, [], {
    value: parseEth(ticketPrice),
    gasLimit: TICKET_GAS
  })
  const lastTicket = readTicket(contract, receipt)
  if (lastTicket) actions.update(lotteryPath(address), { lastTicket })
  await fetchLottery(address)
  return lastTicket
}


export const withdrawLotteryPrize = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, LotteryArtifact.abi)
  await sendTx(contract.withdrawPrize, [])
  await fetchLottery(address)
}


const readTicket = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  let lastTicket
  let settled = false
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name === "Settled") settled = true
      if (name !== "TicketBought") continue
      lastTicket = {
        won: args.won,
        polygonId: Number(args.polygonId),
        assigned: args.assigned
      }
    } catch {
      // ignore logs from other contracts
    }
  }
  if (!lastTicket) return
  return { ...lastTicket, settled }
}
