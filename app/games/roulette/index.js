import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract } from "app/core/contracts"


const TABLE_DATA_FIELDS = ["memberShares", "playerBalance", "totalBalance", "totalShares"]

const roulettePath = (address) => `games.roulette.${ethers.getAddress(address)}`


export const selectRoulette = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(roulettePath(address), EMPTY_OBJECT)
}

export const fetchRoulette = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const data = await contract.getTable()
  const formattedData = TABLE_DATA_FIELDS.reduce((acc, field) => {
    acc[field] = ethers.formatEther(data[field] || 0)
    return acc
  }, {})
  actions.update(roulettePath(address), formattedData)
}

export const buyTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  const tx = await contract.depositShares({
    value: ethers.parseEther(balance.toString())
  })
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
        totalBetAmount: ethers.formatEther(args.totalBetAmount),
        winningAmount: ethers.formatEther(args.winningAmount),
        playerBalance: ethers.formatEther(args.playerBalance)
      }
    } catch {
      // ignore logs from other contracts
    }
  }
}
