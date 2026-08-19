import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."


export const selectAuth = () => actions.get("auth", EMPTY_OBJECT)


export const logout = () => actions.unset("auth")
export const login = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const account = await signer.getAddress()
  actions.set("auth", { account })
}
