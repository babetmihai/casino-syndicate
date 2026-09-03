import { ethers } from "ethers"
import _ from "lodash"

export const CHIP_VALUES = [0.01, 0.05, 0.25, 1]
export const LOW_BANKROLL_MULTIPLIER = 200
export const MIN_TABLE_DEPOSIT = 1
export const MIN_BET = 0.01
export const WITHDRAW_INTERVAL = 86400

export const clampEth = (amount) => {
  const value = Number(amount) || 0
  if (value <= 0) return 0
  return _.floor(value, 2)
}

export const addEth = (amount, delta) => {
  const cents = _.round((Number(amount) || 0) * 100) + _.round((Number(delta) || 0) * 100)
  if (cents <= 0) return 0
  return cents / 100
}

export const formatEth = (wei) => clampEth(ethers.formatEther(wei || 0n))

export const parseEth = (eth) => ethers.parseEther(clampEth(eth).toFixed(2))

export const ethLabel = (amount, symbol) => `${clampEth(amount)} ${symbol || "ETH"}`

export const chipLabel = (value) => {
  if (value >= 1) return String(value)
  return String(value).replace(/^0/, "")
}

export const tableMaxBet = (maxBet) => clampEth(maxBet) || MIN_BET

export const isBankrollLow = (bankroll, maxBet) => {
  return clampEth(bankroll) < clampEth(tableMaxBet(maxBet) * LOW_BANKROLL_MULTIPLIER)
}

export const bankrollClass = (bankroll, maxBet) => {
  if (isBankrollLow(bankroll, maxBet)) return "bankroll bankroll-low text-red-600"
  return "bankroll text-cs-accent"
}

export const CHIP_COLORS = {
  0.01: {
    fill: "var(--mantine-color-gray-0)",
    stroke: "var(--mantine-color-gray-5)",
    text: "var(--mantine-color-dark-6)"
  },
  0.05: {
    fill: "var(--mantine-color-red-6)",
    stroke: "var(--mantine-color-red-8)",
    text: "var(--mantine-color-white)"
  },
  0.25: {
    fill: "var(--mantine-color-teal-6)",
    stroke: "var(--mantine-color-teal-8)",
    text: "var(--mantine-color-white)"
  },
  1: {
    fill: "var(--cs-bg)",
    stroke: "var(--cs-border)",
    text: "var(--cs-text)"
  }
}

export const toChips = (amount) => {
  const chips = []
  let remaining = _.round(clampEth(amount) * 100)
  const units = _.map(CHIP_VALUES, (value) => _.round(value * 100))
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i]
    while (remaining >= unit) {
      chips.push(CHIP_VALUES[i])
      remaining -= unit
    }
  }
  return chips
}
