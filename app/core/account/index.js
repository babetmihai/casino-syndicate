import { ethers } from "ethers"
import { actions } from "../store"


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

