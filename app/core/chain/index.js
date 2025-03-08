import { ethers } from "ethers"
import { actions } from "../store"
import { EMPTY_OBJECT } from ".."

export const selectChain = () => actions.get("chain", EMPTY_OBJECT)


const { VITE_CONTRACT_NAME } = import.meta.env

const chain = {
  contract: null,
  account: null,
  init: async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" })
    const config = await fetch(`/${VITE_CONTRACT_NAME}.json?v=${Date.now()}`)
      .then(res => res.json())
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contract = new ethers.Contract(config.address, config.abi, signer)
    const signedContract = contract.connect(signer)
    const account = await signer.getAddress()


    chain.contract = signedContract
    chain.account = account
    actions.set("chain", { account, contract })
    return signedContract
  },
  unset: () => {
    chain.contract = null
    chain.account = null
    actions.unset("chain")
  },
  get: () => chain.contract
}

export default chain