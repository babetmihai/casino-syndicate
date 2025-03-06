import { ethers } from "ethers"
import { actions } from "../store"


export const selectAccount = () => actions.get("wallet.account")
export const connectAccount = async () => {
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
