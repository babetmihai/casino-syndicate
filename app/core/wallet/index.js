import { ethers } from "ethers"
import { EMPTY_OBJECT } from ".."
import { actions } from "../store"


export const selectWallet = () => actions.get("wallet", EMPTY_OBJECT)
export const connectWallet = async () => {
  await getWalletProvider()
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
  const account = accounts[0]

  actions.set("wallet", { account })
}

export const disconnectWallet = () => actions.unset("wallet")


export const getWalletProvider = () => {
  if (!window.ethereum) throw new Error("metamask_not_detected")
  return new ethers.BrowserProvider(window.ethereum)
}
