import { buyPolygonsTicket, fetchPolygons, fromRankedIds, packedTickets, polygonsActions, selectPolygons, unwatchPolygons, withdrawPolygonsPrize } from ".."
import { fetchBalance, selectAuth } from "app/core/auth"
import { requirePlayWallet } from "app/core/auth/SessionModal"
import { clampEth } from "app/games/roulette/chips"
import { ethers } from "ethers"
import _ from "lodash"

const HOLD_MS = 160
const HOLD_FILL_MS = 1000
const CLEAR_MS = 500
const BANNER_MS = 2500
const BANNER_LONG_MS = 4500

const spins = {}

export const spinOf = (address) => {
  const key = ethers.getAddress(address)
  if (!spins[key]) spins[key] = { id: key, holding: false }
  return spins[key]
}

const updateGame = (address, payload) => polygonsActions(address).update(payload)

export const setMultiplier = (address, multiplier) => updateGame(address, { multiplier })

export const canSpinPolygons = (address) => {
  const game = selectPolygons(address) || {}
  const { session, balance } = selectAuth() || {}
  const { authorized } = session || {}
  const {
    ticketPrice, claimedCount, polygonCount, loseLit, loseCount, myPrize,
    buying, revealing, showBanner, awaitNewGame, multiplier = 1
  } = game
  const hasPrize = clampEth(myPrize) > 0
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const pack = packedTickets(polygonCount, multiplier)
  const totalPrice = clampEth(ticketPrice) * pack
  return authorized && clampEth(balance) >= totalPrice && !buying && roundOpen && !showBanner && !hasPrize && !revealing && !awaitNewGame
}

export const claimPrize = async (address) => {
  const game = selectPolygons(address) || {}
  const { myPrize, claiming } = game
  if (clampEth(myPrize) <= 0 || claiming) return
  if (!requirePlayWallet()) return
  updateGame(address, { claiming: true })
  try {
    await withdrawPolygonsPrize(address)
    const spin = spinOf(address)
    spin.resultSnap = undefined
    spin.boardSnap = undefined
    updateGame(address, {
      claiming: false,
      holdBoard: false,
      landed: false,
      litIds: {},
      revealedOwners: {},
      owners: {},
      claimedCount: 0,
      loseLit: 0,
      prize: 0
    })
    fetchPolygons(address)
    fetchBalance()
  } finally {
    updateGame(address, { claiming: false })
  }
}

export const ackMapPrompt = (address) => {
  const game = selectPolygons(address) || {}
  const { myPrize, awaitNewGame } = game
  if (clampEth(myPrize) > 0) {
    claimPrize(address)
    return
  }
  if (!awaitNewGame) return
  const spin = spinOf(address)
  spin.resultSnap = undefined
  spin.boardSnap = undefined
  updateGame(address, {
    awaitNewGame: false,
    holdBoard: false,
    owners: {},
    claimedCount: 0,
    loseLit: 0,
    prize: 0,
    litIds: {},
    landed: false,
    revealedOwners: {}
  })
  fetchPolygons(address)
}

const clearSpinPaint = (address) => {
  const spin = spinOf(address)
  spin.boardSnap = undefined
  updateGame(address, { litIds: {}, landed: false, revealedOwners: {} })
}

export const showResultBanner = (address, house) => {
  const spin = spinOf(address)
  clearTimeout(spin.bannerTimer)
  const game = selectPolygons(address) || {}
  const { lastTicket = {} } = game
  const { settled, playersWin } = lastTicket
  let wait = BANNER_MS
  if (settled && playersWin) wait = BANNER_LONG_MS
  if (!settled && playersWin == null) wait = HOLD_MS
  if (house) {
    showHouseResult(address)
    return
  }
  updateGame(address, { showBanner: true })
  spin.bannerTimer = _.delay(() => {
    updateGame(address, { showBanner: false })
    const next = selectPolygons(address) || {}
    if (clampEth(next.myPrize) > 0) return
    clearSpinPaint(address)
  }, wait)
}

export const setBeat = (address, beat) => {
  updateGame(address, { beat })
  const spin = spinOf(address)
  clearTimeout(spin.beatTimer)
  if (!beat) return
  spin.beatTimer = _.delay(() => updateGame(address, { beat: "" }), BANNER_MS)
}

const freezeHouseBoard = (address, ticket) => {
  const spin = spinOf(address)
  const game = selectPolygons(address) || {}
  const { account } = selectAuth() || {}
  const { polygonCount, prize, revealedOwners = {} } = game
  const snap = spin.boardSnap || game
  const owners = { ...(snap.owners || {}), ...revealedOwners }
  let player
  if (account) player = ethers.getAddress(account)
  _.forEach(ticket.draws || {}, (draw) => {
    if (!draw.assigned) return
    if (!player) return
    const id = draw.polygonId
    owners[id] = { id, address: player }
  })
  let claimedCount = 0
  let loseLit = 0
  _.forEach(owners, ({ id }) => {
    const isPlayerCell = id < (polygonCount || 0)
    if (isPlayerCell) {
      claimedCount += 1
      return
    }
    loseLit += 1
  })
  return { owners, claimedCount, loseLit, prize }
}

export const showHouseResult = (address) => {
  updateGame(address, { awaitNewGame: true })
  setBeat(address, "House wins")
}

const scheduleClearLit = (address) => {
  const spin = spinOf(address)
  clearTimeout(spin.clearTimer)
  spin.clearTimer = _.delay(() => {
    const game = selectPolygons(address) || {}
    if (game.revealing || game.showBanner || !game.landed) return
    clearSpinPaint(address)
  }, CLEAR_MS)
}

export const revealCell = (address, id) => {
  const { account } = selectAuth() || {}
  if (!account) return
  if (!_.isFinite(id)) return
  const player = ethers.getAddress(account)
  const game = selectPolygons(address) || {}
  const { revealedOwners = {} } = game
  const nextOwners = { ...revealedOwners }
  nextOwners[id] = { id, address: player }
  updateGame(address, { revealedOwners: nextOwners })
}

export const finishSpin = async (address, ids) => {
  const spin = spinOf(address)
  const ticket = spin.ticket
  if (!ticket) {
    spin.spinning = false
    updateGame(address, { revealing: false, buying: false })
    return
  }
  const draws = ticket.draws || {}
  let litIds = ids
  if (_.isArray(litIds)) litIds = fromRankedIds(litIds)
  if (_.isEmpty(litIds)) {
    litIds = {}
    _.forEach(draws, (draw) => {
      if (!draw.assigned) return
      litIds[draw.polygonId] = { id: draw.polygonId, rank: draw.id }
    })
  }
  const houseWin = ticket.settled && !ticket.playersWin
  if (houseWin) {
    spin.spinning = false
    spin.seenHouseSettle = ticket.id
    const frozen = freezeHouseBoard(address, ticket)
    spin.resultSnap = frozen
    updateGame(address, {
      ...frozen,
      revealing: false,
      buying: false,
      holdBoard: true,
      lastSettle: { id: ticket.id, playersWin: false },
      litIds: {},
      landed: false
    })
    fetchBalance()
    showHouseResult(address)
    return
  }
  const playersWin = ticket.settled && ticket.playersWin
  if (playersWin) {
    spin.spinning = false
    const frozen = freezeHouseBoard(address, ticket)
    spin.resultSnap = frozen
    updateGame(address, {
      ...frozen,
      holdBoard: true,
      landed: true,
      litIds,
      revealing: false,
      buying: false
    })
    fetchPolygons(address)
    fetchBalance()
    showResultBanner(address)
    return
  }
  updateGame(address, { landed: true, litIds })
  fetchPolygons(address)
  fetchBalance()
  await new Promise((resolve) => _.delay(resolve, 0))
  spin.spinning = false
  updateGame(address, { revealing: false, buying: false })
  scheduleClearLit(address)
}

const buyTicket = async (address) => {
  const game = selectPolygons(address) || {}
  const { multiplier = 1, polygonCount } = game
  const pack = packedTickets(polygonCount, multiplier)
  updateGame(address, { buying: true, revealing: true, litIds: {}, landed: false, revealedOwners: {} })
  const spin = spinOf(address)
  try {
    const ticket = await buyPolygonsTicket(address, pack)
    if (!ticket) {
      spin.spinning = false
      spin.landing = []
      updateGame(address, { revealing: false, buying: false })
      return
    }
    spin.ticket = ticket
    spin.landing = _.map(_.sortBy(_.filter(Object.values(ticket.draws || {}), "assigned"), "id"), "polygonId")
  } catch {
    spin.spinning = false
    spin.landing = []
    updateGame(address, { revealing: false, buying: false, litIds: {}, landed: false })
  }
}

export const cancelSpinHold = (address) => {
  const spin = spinOf(address)
  if (!spin.holdTimer) {
    spin.holding = false
    updateGame(address, { holdingSpin: false })
    return
  }
  clearTimeout(spin.holdTimer)
  spin.holdTimer = null
  spin.spinning = false
  spin.boardSnap = undefined
  spin.landing = undefined
  spin.ticket = undefined
  spin.holding = false
  updateGame(address, {
    holdingSpin: false,
    revealing: false,
    litIds: {},
    landed: false,
    beat: "",
    revealedOwners: {}
  })
}

export const startSpinHold = (address, event) => {
  if (!canSpinPolygons(address)) return
  if (event.button > 0) return
  const spin = spinOf(address)
  if (spin.holdTimer || spin.spinning) return
  spin.spinning = true
  spin.landing = undefined
  spin.ticket = undefined
  unwatchPolygons(address)
  const { owners, claimedCount, loseLit } = selectPolygons(address) || {}
  spin.boardSnap = { owners, claimedCount, loseLit }
  spin.holding = true
  spin.revealedOwners = undefined
  updateGame(address, { holdingSpin: true, landed: false, beat: "", revealedOwners: {} })
  spin.holdTimer = _.delay(() => {
    spin.holdTimer = null
    spin.holding = false
    updateGame(address, { holdingSpin: false })
    buyTicket(address)
  }, HOLD_FILL_MS)
}

export const noteHouseSettle = (address, settleId) => {
  const spin = spinOf(address)
  if (!settleId) return
  if (settleId === spin.seenHouseSettle) return
  spin.seenHouseSettle = settleId
  const { revealing, buying, holdingSpin } = selectPolygons(address) || {}
  if (revealing || buying || holdingSpin) return
  showResultBanner(address, true)
}

export const unmountPolygonsGame = (address) => {
  const spin = spinOf(address)
  clearTimeout(spin.holdTimer)
  clearTimeout(spin.bannerTimer)
  clearTimeout(spin.beatTimer)
  clearTimeout(spin.clearTimer)
  delete spins[ethers.getAddress(address)]
}
