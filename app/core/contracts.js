import { ethers } from "ethers"


const { VITE_CONTRACT_NAME } = import.meta.env

const contracts = {
  instance: {},
  init: async () => {
    const config = await fetch(`/${VITE_CONTRACT_NAME}.json?v=${Date.now()}`)
      .then(res => res.json())
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const contract = new ethers.Contract(config.address, config.abi, signer)
    const signedContract = contract.connect(signer)

    contracts.instance = signedContract
    return signedContract
  },
  get: () => contracts.instance
}

export default contracts