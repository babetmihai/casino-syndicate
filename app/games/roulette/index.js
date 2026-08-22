import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "./chips"


const roulettePath = (address) => `games.roulette.${ethers.getAddress(address)}`


export const selectRoulette = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(roulettePath(address), EMPTY_OBJECT)
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
  actions.update(roulettePath(address), {
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
  const values = bets.map((bet) => parseEth(bet || 0))
  const value = values.reduce((sum, amount) => sum + amount, 0n)
  const receipt = await sendTx(contract.postBet, [values], { value })
  const lastSpin = readWinningNumber(contract, receipt)
  if (lastSpin) actions.update(roulettePath(address), { lastSpin })
  return lastSpin
}

export const pushSpinHistory = (address, number) => {
  actions.update(roulettePath(address), (current) => {
    const { history = [] } = current || {}
    return {
      ...current,
      history: [...history, number]
    }
  })
}


const readWinningNumber = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name !== "WinningNumber") continue
      return {
        number: Number(args.number),
        totalBetAmount: formatEth(args.totalBetAmount),
        winningAmount: formatEth(args.winningAmount),
        playerBalance: formatEth(args.playerBalance)
      }
    } catch {
      // ignore logs from other contracts
    }
  }
}
