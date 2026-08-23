import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { clampEth, formatEth, parseEth } from "app/games/roulette/chips"
import PolygonsArtifact from "artifacts/contracts/Polygons.sol/Polygons.json"
import _ from "lodash"

export const MIN_POLYGONS = 6
export const MAX_POLYGONS = 128
export const TICKET_MULTIPLIERS = [1, 5, 10, 25]
export const packedTickets = (multiplier = 1) => {
  if (_.includes(TICKET_MULTIPLIERS, multiplier)) return multiplier
  return 1
}
export const ticketGas = (count) => 3000000n + BigInt(_.max([count - 1, 0])) * 200000n

export const polygonsActions = (address) => actions.create("games.polygons").create(() => ethers.getAddress(address))


export const selectPolygons = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return polygonsActions(address).get()
}

export const fetchPolygons = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, PolygonsArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const owners = fromOwners(row.owners)
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const claimedCount = Number(row.claimedCount)
  const loseLit = Number(row.loseLit)
  const prev = selectPolygons(address) || {}
  const occupied = claimedCount + loseLit
  let livePlayers = prev.livePlayers || {}
  if (occupied > 0) livePlayers = fromPlayers(owners)
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
  let overlay = {}
  const spinBusy = prev.revealing || prev.holdingSpin || prev.buying || prev.showBanner || prev.landed
  const houseJustSettled = occupied === 0 && wasOccupied && lastSettle && !lastSettle.playersWin
  const prizeOpen = clampEth(prev.myPrize) > 0
  const freezeBoard = prev.awaitNewGame || prev.holdBoard || houseJustSettled || prizeOpen
  if (occupied === 0 && wasOccupied && !spinBusy && !freezeBoard) {
    overlay = { revealedOwners: {}, litIds: {}, landed: false }
  }
  let nextOwners = owners
  let nextClaimed = claimedCount
  let nextLose = loseLit
  let nextPrize = formatEth(row.prize)
  let nextLive = livePlayers
  if (freezeBoard) {
    nextOwners = prev.owners || owners
    nextClaimed = prev.claimedCount
    nextLose = prev.loseLit
    nextPrize = prev.prize
    nextLive = prev.livePlayers || livePlayers
  }
  polygonsActions(address).update({
    polygonCount: Number(row.polygonCount),
    loseCount: Number(row.loseCount),
    ticketPrice: formatEth(await contract.ticketPrice()),
    claimedCount: nextClaimed,
    loseLit: nextLose,
    prize: nextPrize,
    myPrize: formatEth(row.myPrize),
    memberShares: formatEth(row.memberShares),
    totalBalance: formatEth(row.totalBalance),
    lastWithdrawAt: Number(row.lastWithdrawAt),
    owner,
    owners: nextOwners,
    livePlayers: nextLive,
    lastSettle,
    ...overlay
  })
}


const polygonsWatches = {}

export const watchPolygons = (address) => {
  if (!address || !ethers.isAddress(address)) return
  const key = ethers.getAddress(address)
  if (polygonsWatches[key]) return
  const refresh = _.debounce(() => fetchPolygons(address), 200)
  polygonsWatches[key] = { id: key, refresh, timer: setInterval(refresh, 1500) }
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
  if (lastTicket) polygonsActions(address).update({ lastTicket })
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


export const fromOwners = (items) => {
  const result = {}
  _.forEach(items, (item, index) => {
    if (!item || item === ethers.ZeroAddress) return
    result[index] = { id: index, address: ethers.getAddress(item) }
  })
  return result
}

export const fromRankedIds = (ids) => {
  const result = {}
  _.forEach(ids, (id, rank) => {
    result[id] = { id, rank }
  })
  return result
}

const fromPlayers = (owners) => {
  const result = {}
  _.forEach(owners, ({ address }) => {
    if (!address) return
    result[address] = { id: address }
  })
  return result
}

const readTicket = (contract, receipt) => {
  const { logs, hash } = receipt || {}
  const draws = {}
  let settled = false
  let playersWin
  let roundPrize
  let roundOwners
  let closer
  let refundedCount = 0
  let refunded = 0
  let drawId = 0
  _.forEach(logs, (log) => {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name === "TicketsRefunded") {
        refundedCount = Number(args.count)
        refunded = formatEth(args.amount)
      }
      if (name === "Settled") {
        settled = true
        roundPrize = formatEth(args.prize)
        playersWin = args.playersWin
        roundOwners = fromOwners(args.owners)
        const closerRaw = args.closer
        if (closerRaw && closerRaw !== ethers.ZeroAddress) closer = ethers.getAddress(closerRaw)
      }
      if (name !== "TicketBought") return
      draws[drawId] = {
        id: drawId,
        won: args.won,
        polygonId: Number(args.polygonId),
        assigned: args.assigned,
        split: Boolean(args.split),
        bounce: Boolean(args.bounce),
        fromId: Number(args.fromId)
      }
      drawId += 1
    } catch {
      // ignore logs from other contracts
    }
  })
  if (_.isEmpty(draws) && !settled) return
  const claimed = _.pickBy(draws, "assigned")
  const last = _.last(Object.values(claimed)) || _.last(Object.values(draws)) || {}
  const takenIds = {}
  const loseIds = {}
  _.forEach(draws, (draw) => {
    if (draw.won && !draw.assigned) takenIds[draw.polygonId] = { id: draw.polygonId }
    if (!draw.won) loseIds[draw.polygonId] = { id: draw.polygonId }
  })
  return {
    id: hash,
    ...last,
    assignedCount: _.size(claimed),
    wonCount: _.size(_.pickBy(draws, "won")),
    loseAssignedCount: _.size(_.pickBy(draws, (draw) => draw.assigned && !draw.won)),
    winAssignedCount: _.size(_.pickBy(draws, (draw) => draw.assigned && draw.won)),
    drawCount: _.size(draws),
    draws,
    takenIds,
    loseIds,
    settled,
    playersWin,
    roundPrize,
    roundOwners,
    closer,
    refundedCount,
    refunded
  }
}
