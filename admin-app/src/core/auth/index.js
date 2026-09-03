import { actions } from "../store"
import {
  fundAccount,
  getBalance,
  getWalletSigner,
  resetProvider,
  syncWalletChain
} from "../contracts"
import { formatEth } from "app/games/roulette/chips"
import { isLocalChain, selectChain } from "../chain"

const authActions = actions.create("auth")


export const selectAuth = () => authActions.get()


export const fetchWalletBalance = async () => {
  const { account } = selectAuth()
  if (!account) return
  const balance = await getBalance(account)
  authActions.set("walletBalance", formatEth(balance))
}

export const logout = () => authActions.unset()

export const login = async () => {
  const signer = await getWalletSigner()
  const account = await signer.getAddress()
  authActions.set({ id: account, account })
  await fetchWalletBalance()
}

export const requestTestEth = async () => {
  const { account } = selectAuth()
  const { chainId } = selectChain()
  if (!isLocalChain(chainId)) return
  await fundAccount(account)
  await fetchWalletBalance()
}

let watchingWallet

export const watchWallet = async () => {
  if (!window.ethereum) return
  await syncWalletChain()
  const { account } = selectAuth()
  if (account) await fetchWalletBalance()
  if (watchingWallet) return
  watchingWallet = true
  window.ethereum.on("chainChanged", async () => {
    resetProvider()
    await syncWalletChain()
    const { account: next } = selectAuth()
    if (next) await fetchWalletBalance()
  })
}
