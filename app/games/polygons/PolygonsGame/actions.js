import { buyPolygonsTicket, fetchPolygons, fromRankedIds, polygonsActions, selectPolygons, unwatchPolygons, withdrawPolygonsPrize } from ".."
import { fetchBalance, selectAuth } from "app/core/auth"
import { requirePlayWallet } from "app/core/auth/SessionModal"
import { clampEth } from "app/games/roulette/chips"
import { NUCLEUS_ID } from "../polygons"
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
    buying, revealing, showBanner, multiplier = 1
  } = game
  const hasPrize = clampEth(myPrize) > 0
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalPrice = clampEth(ticketPrice) * multiplier
  return authorized && clampEth(balance) >= totalPrice && !buying && roundOpen && !showBanner && !hasPrize && !revealing
}

export const claimPrize = async (address) => {
  const game = selectPolygons(address) || {}
  const { myPrize, claiming } = game
  if (clampEth(myPrize) <= 0 || claiming) return
  if (!requirePlayWallet()) return
  updateGame(address, { claiming: true })
  try {
    await withdrawPolygonsPrize(address)
    fetchBalance()
  } finally {
    updateGame(address, { claiming: false })
  }
}

const clearSpinPaint = (address) => {
  const spin = spinOf(address)
  spin.boardSnap = undefined
  updateGame(address, { litIds: {}, landed: false, revealedOwners: {}, revealedMates: {} })
}

export const showResultBanner = (address) => {
  updateGame(address, { showBanner: true })
  const spin = spinOf(address)
  clearTimeout(spin.bannerTimer)
  const game = selectPolygons(address) || {}
  const { lastTicket = {} } = game
  const { settled, playersWin } = lastTicket
  let wait = BANNER_MS
  if (settled && playersWin) wait = BANNER_LONG_MS
  if (!settled && playersWin == null) wait = HOLD_MS
  spin.bannerTimer = _.delay(() => {
    updateGame(address, { showBanner: false })
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

const scheduleClearLit = (address) => {
  const spin = spinOf(address)
  clearTimeout(spin.clearTimer)
  spin.clearTimer = _.delay(() => {
    const game = selectPolygons(address) || {}
    if (game.revealing || game.showBanner || !game.landed) return
    clearSpinPaint(address)
  }, CLEAR_MS)
}

export const revealCell = (address, id, draw) => {
  const { account } = selectAuth() || {}
  if (!account) return
  if (!_.isFinite(id)) return
  const player = ethers.getAddress(account)
  const game = selectPolygons(address) || {}
  const { revealedOwners = {}, revealedMates = {} } = game
  const nextOwners = { ...revealedOwners }
  const nextMates = { ...revealedMates }
  if (draw && draw.split) {
    nextMates[id] = { id, address: player }
  } else {
    nextOwners[id] = { id, address: player }
  }
  updateGame(address, { revealedOwners: nextOwners, revealedMates: nextMates })
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
  updateGame(address, { landed: true, litIds })
  fetchPolygons(address)
  fetchBalance()
  await new Promise((resolve) => _.delay(resolve, 0))
  spin.spinning = false
  updateGame(address, { revealing: false, buying: false })
  if (ticket.settled) {
    showResultBanner(address)
    return
  }
  scheduleClearLit(address)
  const nucleusHit = _.some(draws, (draw) => {
    return draw.assigned && draw.won && draw.polygonId === NUCLEUS_ID
  })
  if (nucleusHit) setBeat(address, "Nucleus")
}

const buyTicket = async (address) => {
  const { multiplier = 1 } = selectPolygons(address) || {}
  updateGame(address, { buying: true, revealing: true, litIds: {}, landed: false, revealedOwners: {}, revealedMates: {} })
  const spin = spinOf(address)
  try {
    const ticket = await buyPolygonsTicket(address, multiplier)
    if (!ticket) {
      spin.spinning = false
      spin.landing = undefined
      updateGame(address, { revealing: false, buying: false })
      return
    }
    spin.ticket = ticket
    spin.landing = _.map(_.sortBy(_.filter(Object.values(ticket.draws || {}), "assigned"), "id"), "polygonId")
  } catch {
    spin.spinning = false
    spin.landing = undefined
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
    revealedOwners: {},
    revealedMates: {}
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
  const { owners, mates, claimedCount, loseLit } = selectPolygons(address) || {}
  spin.boardSnap = { owners, mates, claimedCount, loseLit }
  spin.holding = true
  spin.revealedOwners = undefined
  spin.revealedMates = undefined
  updateGame(address, { holdingSpin: true, landed: false, beat: "", revealedOwners: {}, revealedMates: {} })
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
  showResultBanner(address)
}

export const unmountPolygonsGame = (address) => {
  const spin = spinOf(address)
  clearTimeout(spin.holdTimer)
  clearTimeout(spin.bannerTimer)
  clearTimeout(spin.beatTimer)
  clearTimeout(spin.clearTimer)
  delete spins[ethers.getAddress(address)]
}
