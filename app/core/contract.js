import { ethers } from "ethers"
import { getWalletProvider } from "./wallet"
import { actions } from "./store"


const { VITE_CONTRACT_NAME } = import.meta.env

export const initContract = async () => {
  const config = await fetch(`/${VITE_CONTRACT_NAME}.json?v=${Date.now()}`)
    .then(res => res.json())
  const provider = await getWalletProvider()
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(config.address, config.abi, signer)
  actions.set("wallet.contract", contract)
}

