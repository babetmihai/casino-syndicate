import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."
import config from "../../../.contractrc.json"

export const selectWallet = () => actions.get("wallet", EMPTY_OBJECT)
export const selectContract = () => actions.get("wallet.contract")

export const initWallet = async () => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(config.address, config.abi, signer)
  const contractWithSigner = contract.connect(signer)
  const account = await signer.getAddress()
  actions.set("wallet", { account, contract: contractWithSigner, config })

}

export const disconnectWallet = () => {
  actions.unset("wallet")
}

