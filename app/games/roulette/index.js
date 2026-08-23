import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "./chips"
import { BET_COUNT } from "./bets"
import _ from "lodash"


export const rouletteActions = (address) => actions.create("games.roulette").create(() => ethers.getAddress(address))


export const selectRoulette = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return rouletteActions(address).get()
}

export const fetchRoulette = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const memberShares = row[0]
  const playerBalance = row[1]
  const totalShares = row[2]
  const totalBalance = row[3]
  const minBet = row[4]
  const maxBet = row[5]
  const lastWithdrawAt = Number(row[6])
  const ownerRaw = row[7]
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  rouletteActions(address).update({
    memberShares: formatEth(memberShares),
    playerBalance: formatEth(playerBalance),
    totalShares: formatEth(totalShares),
    totalBalance: formatEth(totalBalance),
    minBet: formatEth(minBet),
    maxBet: formatEth(maxBet),
    lastWithdrawAt,
    owner
  })
}

export const buyTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  await sendWalletTx(contract.depositShares, [], {
    value: parseEth(balance)
  })
  await fetchRoulette(address)
}

export const withdrawTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  await sendWalletTx(contract.withdrawShares, [parseEth(balance)])
  await fetchRoulette(address)
}

export const postRouletteBet = async (address, bets) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const values = _.map(_.range(BET_COUNT), (id) => parseEth(_.get(bets, [id, "amount"], 0)))
  const value = _.reduce(values, (sum, amount) => sum + amount, 0n)
  const receipt = await sendTx(contract.postBet, [values], { value })
  const lastSpin = readWinningNumber(contract, receipt)
  if (lastSpin) rouletteActions(address).update({ lastSpin })
  return lastSpin
}

export const pushSpinHistory = (address, number) => {
  rouletteActions(address).update((current) => {
    const { history = {} } = current || {}
    const id = String(_.size(history))
    return {
      ...current,
      history: { ...history, [id]: { id, number } }
    }
  })
}


const readWinningNumber = (contract, receipt) => {
  const { logs, hash } = receipt || {}
  let lastSpin
  _.forEach(logs, (log) => {
    if (lastSpin) return
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name !== "WinningNumber") return
      lastSpin = {
        id: hash,
        number: Number(args.number),
        totalBetAmount: formatEth(args.totalBetAmount),
        winningAmount: formatEth(args.winningAmount),
        playerBalance: formatEth(args.playerBalance)
      }
    } catch {
      // ignore logs from other contracts
    }
  })
  return lastSpin
}
