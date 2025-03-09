import { selectContract } from "../wallet"
import { ethers } from "ethers"

export const fetchTables = async () => {
  const contract = selectContract()
  const tables = await contract.getTableNames()
  return tables
}

export const createTable = async ({ name, balance }) => {
  const contract = selectContract()
  const tx = await contract.createTable(name, {
    value: ethers.parseEther(balance.toString())
  })
  await tx.wait()
}

