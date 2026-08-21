import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import LotteryArtifact from "artifacts/contracts/Lottery.sol/Lottery.json"
import _ from "lodash"

export const MIN_POLYGONS = 3
export const MAX_POLYGONS = 24
export const TICKET_MULTIPLIERS = [1, 5, 10]
export const ticketGas = (count) => 400000n + BigInt(count) * 200000n


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
    loseCount: Number(row.loseCount),
    ticketPrice: formatEth(await contract.ticketPrice()),
    claimedCount: Number(row.claimedCount),
    loseLit: Number(row.loseLit),
    prize: formatEth(row.prize),
    myPrize: formatEth(row.myPrize),
    memberShares: formatEth(row.memberShares),
    totalBalance: formatEth(row.totalBalance),
    lastWithdrawAt: Number(row.lastWithdrawAt),
    owner,
    owners
  })
  if (owner) {
    actions.update(`tables.${tableAddress}`, { createdBy: owner })
  }
}


const lotteryWatches = {}

export const watchLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  if (lotteryWatches[key]) return
  const refresh = _.debounce(() => fetchLottery(address), 200)
  lotteryWatches[key] = { refresh, timer: setInterval(refresh, 1500) }
}

export const unwatchLottery = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  const watch = lotteryWatches[key]
  if (!watch) return
  const { refresh, timer } = watch || {}
  clearInterval(timer)
  refresh.cancel()
  delete lotteryWatches[key]
}

export const buyLotteryTicket = async (address, count = 1) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  const tickets = Number(count) || 1
  const price = await contract.ticketPrice()
  const receipt = await sendTx(contract.buyTickets, [tickets], {
    value: price * BigInt(tickets),
    gasLimit: ticketGas(tickets)
  })
  const lastTicket = readTicket(contract, receipt)
  if (lastTicket) actions.update(lotteryPath(address), { lastTicket })
  return lastTicket
}


export const withdrawLotteryPrize = async (address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendTx(contract.withdrawPrize, [])
  await fetchLottery(address)
}

export const depositLotteryShares = async ({ balance }, address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendTx(contract.depositShares, [], {
    value: parseEth(balance)
  })
  await fetchLottery(address)
}

export const withdrawLotteryShares = async ({ balance }, address) => {
  const contract = await generateContract(address, LotteryArtifact.abi)
  await sendTx(contract.withdrawShares, [parseEth(balance)])
  await fetchLottery(address)
}


const readTicket = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  const draws = []
  let settled = false
  let playersWin
  let roundPrize
  let roundOwners
  let refundAmount
  let refundCount
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name === "Settled") {
        settled = true
        roundPrize = formatEth(args.prize)
        playersWin = args.playersWin
        roundOwners = _.map(args.owners || [], (item) => {
          if (!item || item === ethers.ZeroAddress) return null
          return ethers.getAddress(item)
        })
      }
      if (name === "TicketsRefunded") {
        refundCount = Number(args.count)
        refundAmount = formatEth(args.amount)
      }
      if (name !== "TicketBought") continue
      draws.push({
        won: args.won,
        polygonId: Number(args.polygonId),
        assigned: args.assigned
      })
    } catch {
      // ignore logs from other contracts
    }
  }
  if (draws.length === 0) return
  const claimed = _.filter(draws, "assigned")
  const last = _.last(claimed) || _.last(draws)
  const takenIds = _.uniq(_.map(_.filter(draws, (draw) => !draw.assigned), "polygonId"))
  return {
    ...last,
    assignedCount: claimed.length,
    wonCount: _.filter(draws, "won").length,
    loseAssignedCount: _.filter(draws, (draw) => draw.assigned && !draw.won).length,
    winAssignedCount: _.filter(draws, (draw) => draw.assigned && draw.won).length,
    drawCount: draws.length,
    draws,
    takenIds,
    settled,
    playersWin,
    roundPrize,
    roundOwners,
    refundCount,
    refundAmount
  }
}
