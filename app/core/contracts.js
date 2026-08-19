import { ethers } from "ethers"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import FactoryArtifact from "artifacts/contracts/GameFactory.sol/GameFactory.json"

const contracts = {}
let provider

const { VITE_FACTORY_ADDRESS } = import.meta.env
const LOCAL_CHAIN_ID = 1337n
const LOCAL_CHAIN_HEX = "0x539"
const LOCAL_RPC_URL = "http://127.0.0.1:8545"


const getProvider = () => {
  if (!provider) {
    provider = new ethers.BrowserProvider(window.ethereum)
  }
  return provider
}

const ensureLocalNetwork = async () => {
  const network = await getProvider().getNetwork()
  if (network.chainId === LOCAL_CHAIN_ID) return

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: LOCAL_CHAIN_HEX }]
    })
  } catch (error) {
    const { code } = error || {}
    if (code !== 4902) throw error
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: LOCAL_CHAIN_HEX,
        chainName: "Localhost 1337",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: [LOCAL_RPC_URL]
      }]
    })
  }

  provider = new ethers.BrowserProvider(window.ethereum)
}


export const getSigner = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask!")
  await window.ethereum.request({ method: "eth_requestAccounts" })
  await ensureLocalNetwork()
  provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  await fundAccount(await signer.getAddress())
  return signer
}

export const fundAccount = async (address) => {
  const rpc = new ethers.JsonRpcProvider(LOCAL_RPC_URL)
  const to = ethers.getAddress(address)
  const balance = await rpc.getBalance(to)
  if (balance >= ethers.parseEther("100")) return
  await rpc.send("hardhat_setBalance", [
    to,
    ethers.toBeHex(ethers.parseEther("10000"), 32)
  ])
  await rpc.send("hardhat_mine", ["0x1"])
}

export const getLocalBalance = async (address) => {
  const rpc = new ethers.JsonRpcProvider(LOCAL_RPC_URL)
  return rpc.getBalance(ethers.getAddress(address))
}




export const getContract = (address) => {
  if (!address) return undefined
  if (!ethers.isAddress(address)) return undefined
  return contracts[ethers.getAddress(address)]
}

export const generateContract = async (address, abi = RouletteArtifact.abi) => {
  const checksummed = ethers.getAddress(address)
  const signer = await getSigner()
  let retries = 5
  while (retries > 0) {
    const code = await getProvider().getCode(checksummed)
    if (code !== "0x") break
    await new Promise((resolve) => setTimeout(resolve, 1000))
    retries -= 1
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
    throw new Error("Factory is not deployed. Stay on Localhost 1337 and run npm run chain")
  }
  return new ethers.Contract(VITE_FACTORY_ADDRESS, FactoryArtifact.abi, signer)
}
