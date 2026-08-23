import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import PolygonsArtifact from "artifacts/contracts/Polygons.sol/Polygons.json"
import _ from "lodash"

export const MIN_POLYGONS = 3
export const MAX_POLYGONS = 48
export const TICKET_MULTIPLIERS = [1, 5, 10]
export const ticketGas = (count) => 3000000n + BigInt(_.max([count - 1, 0])) * 200000n

const polygonsPath = (address) => `games.polygons.${ethers.getAddress(address)}`


export const selectPolygons = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(polygonsPath(address), EMPTY_OBJECT)
}

export const fetchPolygons = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, PolygonsArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const owners = _.map(row.owners || [], (item) => {
    if (!item || item === ethers.ZeroAddress) return null
    return ethers.getAddress(item)
  })
  const mates = _.map(row.mates || [], (item) => {
    if (!item || item === ethers.ZeroAddress) return null
    return ethers.getAddress(item)
  })
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const claimedCount = Number(row.claimedCount)
  const loseLit = Number(row.loseLit)
  const prev = selectPolygons(address) || {}
  const occupied = claimedCount + loseLit
  let livePlayers = prev.livePlayers || []
  if (occupied > 0) livePlayers = _.uniq(_.compact([...owners, ...mates]))
  let lastSettle = prev.lastSettle
  const wasOccupied = (prev.claimedCount || 0) + (prev.loseLit || 0) > 0
  if (occupied === 0 && wasOccupied) {
    const logs = await contract.queryFilter(contract.filters.Settled(), -32)
    const latest = _.last(logs)
    if (latest) {
      lastSettle = {
        id: latest.transactionHash,
        playersWin: Boolean(latest.args.playersWin)
      }
    }
  }
  actions.update(polygonsPath(address), {
    polygonCount: Number(row.polygonCount),
    loseCount: Number(row.loseCount),
    ticketPrice: formatEth(await contract.ticketPrice()),
    claimedCount,
    loseLit,
    prize: formatEth(row.prize),
    mates,
    myPrize: formatEth(row.myPrize),
    memberShares: formatEth(row.memberShares),
    totalBalance: formatEth(row.totalBalance),
    lastWithdrawAt: Number(row.lastWithdrawAt),
    owner,
    owners,
    livePlayers,
    lastSettle
  })
}


const polygonsWatches = {}

export const watchPolygons = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  if (polygonsWatches[key]) return
  const refresh = _.debounce(() => fetchPolygons(address), 200)
  polygonsWatches[key] = { refresh, timer: setInterval(refresh, 1500) }
}

export const unwatchPolygons = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  const watch = polygonsWatches[key]
  if (!watch) return
  const { refresh, timer } = watch || {}
  clearInterval(timer)
  refresh.cancel()
  delete polygonsWatches[key]
}

export const buyPolygonsTicket = async (address, count = 1) => {
  const contract = await generateContract(address, PolygonsArtifact.abi)
  const tickets = Number(count) || 1
  const price = await contract.ticketPrice()
  const receipt = await sendTx(contract.buyTickets, [tickets], {
    value: price * BigInt(tickets),
    gasLimit: ticketGas(tickets)
  })
  const lastTicket = readTicket(contract, receipt)
  if (lastTicket) actions.update(polygonsPath(address), { lastTicket })
  return lastTicket
}


export const withdrawPolygonsPrize = async (address) => {
  const contract = await generateContract(address, PolygonsArtifact.abi)
  await sendTx(contract.withdrawPrize, [])
  await fetchPolygons(address)
}

export const depositPolygonsShares = async ({ balance }, address) => {
  const contract = await generateContract(address, PolygonsArtifact.abi)
  await sendWalletTx(contract.depositShares, [], {
    value: parseEth(balance)
  })
  await fetchPolygons(address)
}

export const withdrawPolygonsShares = async ({ balance }, address) => {
  const contract = await generateContract(address, PolygonsArtifact.abi)
  await sendWalletTx(contract.withdrawShares, [parseEth(balance)])
  await fetchPolygons(address)
}


const readTicket = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  const draws = []
  let settled = false
  let playersWin
  let roundPrize
  let roundOwners
  let roundMates
  let closer
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
        roundMates = _.map(args.mates || [], (item) => {
          if (!item || item === ethers.ZeroAddress) return null
          return ethers.getAddress(item)
        })
        const closerRaw = args.closer
        if (closerRaw && closerRaw !== ethers.ZeroAddress) closer = ethers.getAddress(closerRaw)
      }
      if (name !== "TicketBought") continue
      draws.push({
        won: args.won,
        polygonId: Number(args.polygonId),
        assigned: args.assigned,
        split: Boolean(args.split),
        bounce: Boolean(args.bounce),
        fromId: Number(args.fromId)
      })
    } catch {
      // ignore logs from other contracts
    }
  }
  if (draws.length === 0 && !settled) return
  const claimed = _.filter(draws, "assigned")
  const last = _.last(claimed) || _.last(draws) || {}
  const splitIds = _.uniq(_.map(_.filter(draws, "split"), "polygonId"))
  const takenIds = _.uniq(_.map(_.filter(draws, (draw) => {
    return draw.won && !draw.assigned && !draw.split
  }), "polygonId"))
  const loseIds = _.uniq(_.map(_.filter(draws, (draw) => !draw.won), "polygonId"))
  return {
    ...last,
    assignedCount: claimed.length,
    wonCount: _.filter(draws, "won").length,
    loseAssignedCount: _.filter(draws, (draw) => draw.assigned && !draw.won).length,
    winAssignedCount: _.filter(draws, (draw) => draw.assigned && draw.won).length,
    drawCount: draws.length,
    draws,
    takenIds,
    loseIds,
    splitIds,
    settled,
    playersWin,
    roundPrize,
    roundOwners,
    roundMates,
    closer
  }
}
