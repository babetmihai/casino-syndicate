import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { getContract } from "app/core/contracts"


export const selectRoulette = (address) => actions.get(`games.roulette.${address}`, EMPTY_OBJECT)

export const fetchRoulette = async (address) => {
  const contract = getContract(address)
  const data = await contract.getTable()
  const TABLE_DATA_FIELDS = ["memberShares", "playerBalance", "totalBalance", "totalShares"]
  const formattedData = TABLE_DATA_FIELDS.reduce((acc, field) => {
    acc[field] = ethers.formatEther(data[field])
    return acc
  }, {})
  actions.set(`games.roulette.${address}`, formattedData)
  return formattedData
}


export const buyTableShares = async ({ balance }, address) => {
  const contract = getContract(address)
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const tx = await contract.depositShares({
    value: ethers.parseEther(balance.toString())
  })
  await tx.wait()
  await fetchRoulette(address)
}
