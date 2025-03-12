import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { useSelector } from "react-redux"
import React from "react"


const { VITE_CONTRACT_ADDRESS } = import.meta.env

export const selectWallet = () => actions.get("wallet", EMPTY_OBJECT)


export const initWallet = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const abi = await fetch(`/abi.json?t=${new Date().getTime()}`)
    .then((res) => res.json())
  const unsigned = new ethers.Contract(VITE_CONTRACT_ADDRESS, abi, signer)
  const contract = unsigned.connect(signer)
  const account = await signer.getAddress()
  actions.set("wallet", { account, contract })
}

export const disconnectWallet = () => {
  actions.unset("wallet")
}


const selectContract = (address) => actions.get(`contracts.${address}`)

export const useContract = (address) => {
  const contract = useSelector(() => selectContract(address))
  React.useEffect(() => {
    if (address) {
      const init = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const abi = await fetch(`/abi.json?t=${new Date().getTime()}`)
          .then((res) => res.json())
        const contract = new ethers.Contract(address, abi, signer)
        actions.set(`contracts.${address}`, contract)
      }
      init()
    }
  }, [address])

  return [contract]

}
