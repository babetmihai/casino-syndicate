import { ethers } from "ethers"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import FactoryArtifact from "artifacts/contracts/RouletteFactory.sol/RouletteFactory.json"

const contracts = {}
let provider

const { VITE_FACTORY_ADDRESS } = import.meta.env


const getProvider = () => {
  if (!provider) {
    provider = new ethers.BrowserProvider(window.ethereum)
  }
  return provider
}


export const getSigner = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask!")
  await window.ethereum.request({ method: "eth_requestAccounts" })
  return getProvider().getSigner()
}


export const getContract = (address) => {
  if (!address) return undefined
  try {
    return contracts[ethers.getAddress(address)]
  } catch {
    return undefined
  }
}

export const generateContract = async (address, abi = RouletteArtifact.abi) => {
  const checksummed = ethers.getAddress(address)
  const signer = await getSigner()
  let retries = 5
  while (retries > 0) {
    const code = await getProvider().getCode(checksummed)
    if (code !== "0x") break
    await new Promise(resolve => setTimeout(resolve, 1000))
    retries--
  }
  const contract = new ethers.Contract(checksummed, abi, signer)
  contracts[checksummed] = contract
  return contract
}


export const getFactory = async () => {
  if (!VITE_FACTORY_ADDRESS) throw new Error("Missing VITE_FACTORY_ADDRESS")
  const signer = await getSigner()
  const code = await getProvider().getCode(VITE_FACTORY_ADDRESS)
  if (code === "0x") {
    throw new Error("Factory is not deployed. Start the chain and run npm run deploy")
  }
  return new ethers.Contract(VITE_FACTORY_ADDRESS, FactoryArtifact.abi, signer)
}
