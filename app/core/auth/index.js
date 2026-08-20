import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import { fundAccount, getLocalBalance, getSigner } from "../contracts"
import { formatChips } from "app/games/roulette/chips"


export const selectAuth = () => actions.get("auth", EMPTY_OBJECT)


export const logout = () => actions.unset("auth")

export const fetchBalance = async (account) => {
  const balance = await getLocalBalance(account)
  actions.set("auth.balance", formatChips(balance))
}

export const login = async () => {
  const signer = await getSigner()
  const account = await signer.getAddress()
  actions.set("auth", { account })
  await fetchBalance(account)
}

export const requestTestEth = async () => {
  const { account } = selectAuth()
  await fundAccount(account)
  await fetchBalance(account)
}
