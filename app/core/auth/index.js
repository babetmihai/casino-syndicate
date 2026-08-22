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
import { formatEth, parseEth } from "app/games/roulette/chips"
import { isLocalChain, selectChain } from "../chain"


export const selectAuth = () => actions.get("auth", EMPTY_OBJECT)

export const selectSession = () => {
  const { session } = selectAuth() || {}
  return session || EMPTY_OBJECT
}


export const logout = () => actions.unset("auth")

const playAddress = () => {
  const { session } = selectAuth() || {}
  const { address } = session || {}
  return address
}

export const fetchBalance = async () => {
  const address = playAddress()
  if (!address) return
  const balance = await getBalance(address)
  actions.set("auth.balance", formatEth(balance))
}

const sessionKey = (account) => ethers.getAddress(account)

const localSession = (account) => {
  const sessions = actions.get("sessions", EMPTY_OBJECT)
  const key = sessionKey(account)
  let record = sessions[key]
  const { privateKey, address } = record || {}
  if (privateKey && address) return record
  const wallet = ethers.Wallet.createRandom()
  record = {
    address: wallet.address,
    privateKey: wallet.privateKey
  }
  actions.update("sessions", (current = {}) => ({
    ...current,
    [key]: record
  }))
  return record
}

export const syncSession = async () => {
  const { account } = selectAuth()
  if (!account) return
  const { address } = localSession(account)
  const factory = await getFactory()
  const onChain = await factory.sessionOf(account)
  const authorized = onChain && onChain !== ethers.ZeroAddress && ethers.getAddress(onChain) === ethers.getAddress(address)
  actions.update("auth", {
    session: { address, authorized }
  })
}

export const login = async () => {
  const signer = await getWalletSigner()
  const account = await signer.getAddress()
  actions.set("auth", { account })
  await syncSession()
  await fetchBalance()
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
}

export const withdrawSession = async (amount) => {
  const { account } = selectAuth() || {}
  await sendSessionPayment(account, parseEth(amount))
  await fetchBalance()
}

export const requestTestEth = async () => {
  const { account } = selectAuth()
  const { chainId } = selectChain()
  if (!isLocalChain(chainId)) return
  await fundAccount(account)
}

let watchingWallet

export const watchWallet = async () => {
  if (!window.ethereum) return
  await syncWalletChain()
  const { account } = selectAuth()
  if (account) {
    await syncSession()
    await fetchBalance()
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
    }
  })
}
