import { ethers } from "ethers"
import { actions } from "./store"


const { VITE_CONTRACT_NAME } = import.meta.env

export const initContract = async (account) => {
  const config = await fetch(`/${VITE_CONTRACT_NAME}.json?v=${Date.now()}`)
    .then(res => res.json())
  const contract = new ethers.Contract(config.address, config.abi, account)
  actions.set("wallet.contract", contract)
}

