import { ethers } from "ethers"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import FactoryArtifact from "artifacts/contracts/GameFactory.sol/GameFactory.json"
import { chainFromId, isLocalChain, LOCAL_CHAIN_ID, setChain, targetChainId } from "./chain"

const contracts = {}
let provider

const { VITE_FACTORY_ADDRESS } = import.meta.env
const { rpcUrl: LOCAL_RPC_URL } = chainFromId(LOCAL_CHAIN_ID)


let localRpc

const getLocalRpc = () => {
  if (!localRpc) localRpc = new ethers.JsonRpcProvider(LOCAL_RPC_URL)
  return localRpc
}


export const resetProvider = () => {
  provider = undefined
}

const getProvider = () => {
  if (!provider) {
    provider = new ethers.BrowserProvider(window.ethereum)
  }
  return provider
}

export const syncWalletChain = async () => {
  if (!window.ethereum) return
  const network = await getProvider().getNetwork()
  setChain(network.chainId)
}

const ensureNetwork = async () => {
  const target = targetChainId()
  const network = await getProvider().getNetwork()
  if (Number(network.chainId) === target) return

  const { hexId, name, symbol, rpcUrl } = chainFromId(target)
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }]
    })
  } catch (error) {
    const { code } = error || {}
    if (code !== 4902) throw error
    if (!rpcUrl) throw new Error(`Unsupported chain ${target}`)
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hexId,
        chainName: name,
        nativeCurrency: { name: symbol, symbol, decimals: 18 },
        rpcUrls: [rpcUrl]
      }]
    })
  }

  provider = new ethers.BrowserProvider(window.ethereum)
}


export const getSigner = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask!")
  await window.ethereum.request({ method: "eth_requestAccounts" })
  await ensureNetwork()
  provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const network = await provider.getNetwork()
  setChain(network.chainId)
  if (isLocalChain(network.chainId)) {
    await fundAccount(await signer.getAddress())
  }
  return signer
}

export const fundAccount = async (address) => {
  const rpc = getLocalRpc()
  const to = ethers.getAddress(address)
  const balance = await rpc.getBalance(to)
  if (balance >= ethers.parseEther("100")) return
  await rpc.send("hardhat_setBalance", [
    to,
    ethers.toBeHex(ethers.parseEther("10000"), 32)
  ])
  await rpc.send("hardhat_mine", ["0x1"])
}

export const getBalance = async (address) => {
  return getProvider().getBalance(ethers.getAddress(address))
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
    const { name } = chainFromId(targetChainId())
    throw new Error(`Factory is not deployed on ${name}`)
  }
  return new ethers.Contract(VITE_FACTORY_ADDRESS, FactoryArtifact.abi, signer)
}

export const sendTx = async (method, args, overrides) => {
  const params = args || []
  const extra = overrides || {}
  let { gasLimit } = extra
  if (!gasLimit) {
    const gas = await method.estimateGas(...params, extra)
    gasLimit = gas * 15n / 10n
  }
  const tx = await method(...params, { ...extra, gasLimit })
  return tx.wait()
}
