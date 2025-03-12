import { ethers } from "ethers"
import { actions } from "../store"
import { useSelector } from "react-redux"
import React from "react"


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
