import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import {
  fundAccount,
  getBalance,
  getFactory,
  getWalletSigner,
  resetProvider,
  sendPayment,
  sendSessionPayment,
  sendWalletTx,
  syncWalletChain
} from "../contracts"
import { clampEth, formatEth, parseEth } from "app/games/roulette/chips"
import { isLocalChain, selectChain } from "../chain"

const authActions = actions.create("auth")
const sessionActions = actions.create("sessions")
const pendingBetActions = actions.create("pendingBet")


export const selectAuth = () => authActions.get()

export const selectSession = () => {
  const { session } = selectAuth() || {}
  return session || EMPTY_OBJECT
}


export const logout = () => authActions.unset()

export const selectPendingBet = () => pendingBetActions.get(undefined, 0)

export const setPendingBet = (amount) => {
  pendingBetActions.set(clampEth(amount))
}

const playAddress = () => {
  const { session } = selectAuth() || {}
  const { address } = session || {}
  return address
}

export const fetchBalance = async () => {
  const address = playAddress()
  if (!address) return
  const balance = await getBalance(address)
  authActions.set("balance", formatEth(balance))
}

export const fetchWalletBalance = async () => {
  const { account } = selectAuth()
  if (!account) return
  const balance = await getBalance(account)
  authActions.set("walletBalance", formatEth(balance))
}

const sessionKey = (account) => ethers.getAddress(account)

const localSession = (account) => {
  const sessions = sessionActions.get()
  const key = sessionKey(account)
  let record = sessions[key]
  const { privateKey, address } = record || {}
  if (privateKey && address) return record
  const wallet = ethers.Wallet.createRandom()
  record = {
    id: key,
    address: wallet.address,
    privateKey: wallet.privateKey
  }
  sessionActions.set(key, record)
  return record
}

export const syncSession = async () => {
  const { account } = selectAuth()
  if (!account) return
  const { address } = localSession(account)
  const factory = await getFactory()
  const onChain = await factory.sessionOf(account)
  const authorized = onChain && onChain !== ethers.ZeroAddress && ethers.getAddress(onChain) === ethers.getAddress(address)
  authActions.update({
    session: { id: address, address, authorized }
  })
}

export const login = async () => {
  const signer = await getWalletSigner()
  const account = await signer.getAddress()
  authActions.set({ id: account, account })
  await syncSession()
  await fetchBalance()
  await fetchWalletBalance()
}

export const depositSession = async (amount) => {
  const { session } = selectAuth() || {}
  const { address, authorized } = session || {}
  const value = parseEth(amount)
  if (!authorized) {
    const factory = await getFactory()
    await sendWalletTx(factory.authorizeSession, [address], { value })
  } else {
    await sendPayment(address, value)
  }
  await syncSession()
  await fetchBalance()
  await fetchWalletBalance()
}

export const withdrawSession = async (amount) => {
  const { account } = selectAuth() || {}
  await sendSessionPayment(account, parseEth(amount))
  await fetchBalance()
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
  if (account) {
    await syncSession()
    await fetchBalance()
    await fetchWalletBalance()
  }
  if (watchingWallet) return
  watchingWallet = true
  window.ethereum.on("chainChanged", async () => {
    resetProvider()
    await syncWalletChain()
    const { account: next } = selectAuth()
    if (next) {
      await syncSession()
      await fetchBalance()
      await fetchWalletBalance()
    }
  })
}
