import { ethers } from "ethers"
import { actions } from "../store"
import client from "../client"
import { EMPTY_OBJECT } from ".."


export const selectAuth = () => actions.get("auth", EMPTY_OBJECT)


export const logout = () => actions.unset("auth")
export const login = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const account = await signer.getAddress()
  const { nonce } = await client.post("/auth/nonce", { account })
    .then(({ data }) => data)
  const signature = await signer.signMessage(nonce)
  const { token } = await client.post("/auth/login", { account, signature })
    .then(({ data }) => data)
  actions.set("auth", { token, account })
}
