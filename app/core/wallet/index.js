import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."


const { VITE_CONTRACT_ADDRESS, VITE_CONTRACT_ABI } = import.meta.env

export const selectWallet = () => actions.get("wallet", EMPTY_OBJECT)
export const selectContract = () => actions.get("wallet.contract")

export const initWallet = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const unsigned = new ethers.Contract(VITE_CONTRACT_ADDRESS, VITE_CONTRACT_ABI, signer)
  const contract = unsigned.connect(signer)
  const account = await signer.getAddress()
  actions.set("wallet", { account, contract })
}

export const disconnectWallet = () => {
  actions.unset("wallet")
}

