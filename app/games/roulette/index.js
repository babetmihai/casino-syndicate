import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract } from "app/core/contracts"


const roulettePath = (address) => `games.roulette.${ethers.getAddress(address)}`


const formatEth = (value) => ethers.formatEther(value).replace(/\.0+$/, "")


export const selectRoulette = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(roulettePath(address), EMPTY_OBJECT)
}

export const fetchRoulette = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const row = await contract.getTable()
  const memberShares = row[0]
  const playerBalance = row[1]
  const totalShares = row[2]
  const totalBalance = row[3]
  actions.update(roulettePath(address), {
    memberShares: formatEth(memberShares),
    playerBalance: formatEth(playerBalance),
    totalShares: formatEth(totalShares),
    totalBalance: formatEth(totalBalance)
  })
}

export const buyTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const tx = await contract.depositShares({
    value: ethers.parseEther(Number(balance).toString())
  })
  await tx.wait()
  await fetchRoulette(address)
}

export const withdrawTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const tx = await contract.withdrawShares(
    ethers.parseEther(Number(balance).toString())
  )
  await tx.wait()
  await fetchRoulette(address)
}

export const postRouletteBet = async (address, bets) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const values = bets.map((bet) => ethers.parseEther((bet || 0).toString()))
  const value = values.reduce((sum, amount) => sum + amount, 0n)
  const tx = await contract.postBet(values, { value })
  const receipt = await tx.wait()
  const lastSpin = readWinningNumber(contract, receipt)
  await fetchRoulette(address)
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
