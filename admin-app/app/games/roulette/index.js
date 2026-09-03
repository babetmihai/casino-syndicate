import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "./chips"


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

export const withdrawTableShares = async ({ balance }, address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address)
  await sendWalletTx(contract.withdrawShares, [parseEth(balance)])
  await fetchRoulette(address)
}
