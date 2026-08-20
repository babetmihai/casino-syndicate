import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { fundAccount, getBalance, getSigner, resetProvider, syncWalletChain } from "../contracts"
import { formatEth } from "app/games/roulette/chips"
import { isLocalChain, selectChain } from "../chain"


export const selectAuth = () => actions.get("auth", EMPTY_OBJECT)


export const logout = () => actions.unset("auth")

export const fetchBalance = async (account) => {
  const balance = await getBalance(account)
  actions.set("auth.balance", formatEth(balance))
}

export const login = async () => {
  const signer = await getSigner()
  const account = await signer.getAddress()
  actions.set("auth", { account })
  await fetchBalance(account)
}

export const requestTestEth = async () => {
  const { account } = selectAuth()
  const { chainId } = selectChain()
  if (!isLocalChain(chainId)) return
  await fundAccount(account)
  await fetchBalance(account)
}

let watchingWallet

export const watchWallet = async () => {
  if (!window.ethereum) return
  await syncWalletChain()
  if (watchingWallet) return
  watchingWallet = true
  window.ethereum.on("chainChanged", async () => {
    resetProvider()
    await syncWalletChain()
    const { account } = selectAuth()
    if (account) await fetchBalance(account)
  })
}
