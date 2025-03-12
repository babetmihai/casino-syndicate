import { ethers } from "ethers"
import { actions } from "../store"
import { useSelector } from "react-redux"
import React from "react"
import { selectTable } from "../bak"


export const selectAccount = () => actions.get("account")
export const initAccount = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const account = await signer.getAddress()
  actions.set("account", account)
}
export const disconnectAccount = () => {
  actions.unset("account")
}


export const useContract = (address) => {
  const contract = useSelector(() => selectContract(address))
  React.useEffect(() => {
    if (address) initContract(address)
  }, [address])

  return [contract]
}

const selectContract = (address) => actions.get(`contracts.${address}`)
const initContract = async (address) => {
  const { abi } = selectTable(address)
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(address, abi, signer)
  actions.set(`contracts.${address}`, contract)
  return contract
}

