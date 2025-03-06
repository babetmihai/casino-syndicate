import { ethers } from "ethers"
import { EMPTY_OBJECT } from ".."
import { actions } from "../store"


export const selectWallet = () => actions.get("wallet", EMPTY_OBJECT)
export const connectWallet = async () => {
  if (!window.ethereum) throw new Error("metamask_not_detected")


  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const account = accounts[0]

  actions.set("wallet", { account, provider })
}

export const disconnectWallet = () => actions.unset("wallet")
