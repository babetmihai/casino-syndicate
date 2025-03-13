import { ethers } from "ethers"
import { actions } from "app/core/store"


export const fetchRoulette = async (contract) => {
  const data = await contract.getTable()
  const TABLE_DATA_FIELDS = ["memberShares", "playerBalance", "totalBalance", "totalShares"]
  const formattedData = TABLE_DATA_FIELDS.reduce((acc, field) => {
    acc[field] = ethers.formatEther(data[field])
    return acc
  }, {})
  actions.set(`games.roulette.${contract.target}`, formattedData)
  return formattedData
}


export const buyTableShares = async ({ balance }, contract) => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const tx = await contract.depositShares({
    value: ethers.parseEther(balance.toString())
  })
  await tx.wait()
  await fetchRoulette(contract)
}
