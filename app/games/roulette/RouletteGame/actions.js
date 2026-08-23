import { fetchRoulette, postRouletteBet, pushSpinHistory, rouletteActions, selectRoulette } from ".."
import { fetchBalance, selectAuth, setPendingBet } from "app/core/auth"
import { addEth, clampEth, MIN_BET, tableMaxBet } from "../chips"
import { betWins, maxPotentialPayout } from "../bets"
import { ethers } from "ethers"
import _ from "lodash"

const HOLD_FILL_MS = 1000
const BANNER_MS = 2500
const spins = {}

export const spinOf = (address) => {
  const key = ethers.getAddress(address)
  if (!spins[key]) spins[key] = { id: key }
  return spins[key]
}

const updateGame = (address, payload) => rouletteActions(address).update(payload)

export const setChip = (address, chip) => updateGame(address, { chip })

export const betTotal = (bets) => clampEth(_.sumBy(Object.values(bets || {}), "amount"))

export const canSpinRoulette = (address) => {
  const game = selectRoulette(address) || {}
  const { session, balance } = selectAuth() || {}
  const { authorized } = session || {}
  const { bets = {}, revealing, holdingSpin, showBanner, totalBalance } = game
  const total = betTotal(bets)
  const bankroll = clampEth(totalBalance)
  const playBalance = clampEth(balance)
  const spinning = revealing || holdingSpin
  const canCover = clampEth(maxPotentialPayout(bets)) <= bankroll + total
  return authorized && total > 0 && total <= playBalance && !spinning && !showBanner && canCover
}

const commitBets = (address, nextBets) => {
  const game = selectRoulette(address) || {}
  const { balance } = selectAuth() || {}
  const { totalBalance } = game
  const nextTotal = betTotal(nextBets)
  const playBalance = clampEth(balance)
  const bankroll = clampEth(totalBalance)
  if (nextTotal > playBalance) return
  if (clampEth(maxPotentialPayout(nextBets)) > bankroll + nextTotal) return
  updateGame(address, { bets: nextBets })
  setPendingBet(nextTotal)
}

export const changeBet = (address, index, amount) => {
  const { bets = {}, revealing, holdingSpin, minBet, maxBet } = selectRoulette(address) || {}
  if (revealing || holdingSpin) return
  const nextBets = { ...bets }
  const current = _.get(bets, [index, "amount"], 0)
  let nextValue = addEth(current, amount)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  if (amount > 0 && nextValue > 0 && nextValue < minBetAmount) nextValue = minBetAmount
  if (nextValue > maxBetAmount) nextValue = maxBetAmount
  if (!nextValue) {
    delete nextBets[index]
  } else {
    nextBets[index] = { id: index, amount: nextValue }
  }
  commitBets(address, nextBets)
}

export const moveChip = (address, fromIndex, toIndex, value) => {
  const { bets = {}, revealing, holdingSpin, maxBet } = selectRoulette(address) || {}
  if (revealing || holdingSpin) return
  if (fromIndex === toIndex) return
  const nextBets = { ...bets }
  const fromValue = addEth(_.get(bets, [fromIndex, "amount"], 0), -value)
  const toValue = addEth(_.get(bets, [toIndex, "amount"], 0), value)
  if (toValue > tableMaxBet(maxBet)) return
  if (!fromValue) {
    delete nextBets[fromIndex]
  } else {
    nextBets[fromIndex] = { id: fromIndex, amount: fromValue }
  }
  if (!toValue) {
    delete nextBets[toIndex]
  } else {
    nextBets[toIndex] = { id: toIndex, amount: toValue }
  }
  commitBets(address, nextBets)
}

export const cancelSpinHold = (address) => {
  const spin = spinOf(address)
  if (spin.holdTimer) {
    clearTimeout(spin.holdTimer)
    spin.holdTimer = null
    spin.spinning = false
    updateGame(address, { landingNumber: null })
  }
  updateGame(address, { holdingSpin: false })
}

export const startSpinHold = (address, event) => {
  if (!canSpinRoulette(address)) return
  if (event.button > 0) return
  const spin = spinOf(address)
  if (spin.holdTimer || spin.spinning) return
  event.currentTarget.setPointerCapture(event.pointerId)
  spin.spinning = true
  updateGame(address, { holdingSpin: true, hideResult: true, landingNumber: null })
  spin.holdTimer = _.delay(async () => {
    spin.holdTimer = null
    updateGame(address, { holdingSpin: false, revealing: true })
    const { bets = {} } = selectRoulette(address) || {}
    try {
      const lastSpin = await postRouletteBet(address, bets)
      if (!lastSpin) {
        spin.spinning = false
        updateGame(address, { revealing: false })
        return
      }
      updateGame(address, { landingNumber: lastSpin.number })
    } catch {
      spin.spinning = false
      updateGame(address, { revealing: false, landingNumber: null })
    }
  }, HOLD_FILL_MS)
}

export const finishReveal = (address) => {
  const spin = spinOf(address)
  spin.spinning = false
  const { bets = {}, lastSpin = {} } = selectRoulette(address) || {}
  const { number } = lastSpin
  const nextBets = {}
  _.forEach(bets, (bet) => {
    if (!betWins(bet.id, number)) return
    nextBets[bet.id] = bet
  })
  updateGame(address, {
    revealing: false,
    hideResult: false,
    landingNumber: null,
    showBanner: true,
    bets: nextBets
  })
  setPendingBet(betTotal(nextBets))
  fetchRoulette(address)
  fetchBalance()
  clearTimeout(spin.bannerTimer)
  spin.bannerTimer = _.delay(() => {
    updateGame(address, { showBanner: false })
    pushSpinHistory(address, number)
  }, BANNER_MS)
}

export const resetHideResult = (address) => updateGame(address, { hideResult: false })

export const unmountRouletteGame = (address) => {
  const spin = spinOf(address)
  clearTimeout(spin.holdTimer)
  clearTimeout(spin.bannerTimer)
  delete spins[ethers.getAddress(address)]
  setPendingBet(0)
}
