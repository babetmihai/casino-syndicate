import { ethers } from "ethers"
import RouletteArtifact from "artifacts/contracts/Roulette.sol/Roulette.json"
import FactoryArtifact from "artifacts/contracts/GameFactory.sol/GameFactory.json"
import { chainFromId, isLocalChain, LOCAL_CHAIN_ID, setChain, targetChainId } from "./chain"
import { actions } from "./store"
import { EMPTY_OBJECT } from "."
import _ from "lodash"

const contracts = {}
let provider
let writeProvider
let sessionWallet
const LOCAL_HEAD_KEY = "casino-syndicate.localHead"

const { VITE_FACTORY_ADDRESS } = import.meta.env
const { rpcUrl: LOCAL_RPC_URL } = chainFromId(LOCAL_CHAIN_ID)


let localRpc

const getLocalRpc = () => {
  if (!localRpc) localRpc = new ethers.JsonRpcProvider(LOCAL_RPC_URL)
  return localRpc
}

const isWalletMethod = (method) => {
  if (!method) return true
  if (method.startsWith("wallet_")) return true
  if (method.startsWith("metamask_")) return true
  if (method.startsWith("eth_signTypedData")) return true
  if (method === "eth_sendTransaction") return true
  if (method === "eth_signTransaction") return true
  if (method === "eth_sign") return true
  if (method === "personal_sign") return true
  if (method === "eth_accounts") return true
  if (method === "eth_requestAccounts") return true
  if (method === "eth_chainId") return true
  if (method === "net_version") return true
  return false
}

const localWallet = () => ({
  request: async ({ method, params }) => {
    if (isWalletMethod(method)) return window.ethereum.request({ method, params })
    return getLocalRpc().send(method, params || [])
  },
  on: (...args) => window.ethereum.on(...args),
  removeListener: (...args) => window.ethereum.removeListener(...args)
})

const createBrowserProvider = () => {
  if (isLocalChain(targetChainId()) && window.ethereum) {
    return new ethers.BrowserProvider(localWallet())
  }
  return new ethers.BrowserProvider(window.ethereum)
}

const readHead = () => Number(window.localStorage.getItem(LOCAL_HEAD_KEY) || 0)

const writeHead = (block) => {
  window.localStorage.setItem(LOCAL_HEAD_KEY, String(block))
}

const syncLocalHead = async () => {
  const rpc = getLocalRpc()
  const nodeBlock = await rpc.getBlockNumber()
  let saved = readHead()
  if (saved === 0) saved = 256
  let target = nodeBlock
  if (saved > target) target = saved
  if (target <= nodeBlock) {
    writeHead(nodeBlock)
    return
  }
  await rpc.send("hardhat_mine", [ethers.toQuantity(target - nodeBlock)])
  writeHead(await rpc.getBlockNumber())
}


export const resetProvider = () => {
  provider = undefined
  writeProvider = undefined
  sessionWallet = undefined
  _.forEach(contracts, (_value, key) => {
    delete contracts[key]
  })
}

const getWriteProvider = () => {
  if (writeProvider) return writeProvider
  if (isLocalChain(targetChainId())) {
    writeProvider = getLocalRpc()
    return writeProvider
  }
  const { rpcUrl } = chainFromId(targetChainId())
  if (!rpcUrl) throw new Error(`Unsupported chain ${targetChainId()}`)
  writeProvider = new ethers.JsonRpcProvider(rpcUrl)
  return writeProvider
}

const sessionRecord = () => {
  const { account } = actions.get("auth", EMPTY_OBJECT)
  if (!account) return EMPTY_OBJECT
  const sessions = actions.get("sessions", EMPTY_OBJECT)
  return sessions[ethers.getAddress(account)] || EMPTY_OBJECT
}

const walletFor = (privateKey) => {
  if (sessionWallet && sessionWallet.privateKey === privateKey) return sessionWallet
  sessionWallet = new ethers.Wallet(privateKey, getWriteProvider())
  return sessionWallet
}

const getSessionSigner = () => {
  const { session } = actions.get("auth", EMPTY_OBJECT)
  const { authorized } = session || {}
  if (!authorized) return
  const { privateKey } = sessionRecord()
  if (!privateKey) return
  return walletFor(privateKey)
}

const getProvider = () => {
  if (!provider) provider = createBrowserProvider()
  return provider
}

const getReadProvider = () => {
  if (isLocalChain(targetChainId())) return getLocalRpc()
  return getProvider()
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

  resetProvider()
}


export const getWalletSigner = async () => {
  if (!window.ethereum) throw new Error("Please install MetaMask!")
  await window.ethereum.request({ method: "eth_requestAccounts" })
  await ensureNetwork()
  const signer = await getProvider().getSigner()
  const network = await getProvider().getNetwork()
  setChain(network.chainId)
  if (isLocalChain(network.chainId)) {
    await fundAccount(await signer.getAddress())
    await syncLocalHead()
  }
  return signer
}

export const getWriteSigner = async () => {
  const session = getSessionSigner()
  if (!session) throw new Error("Play wallet required")
  return session
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
  return getReadProvider().getBalance(ethers.getAddress(address))
}


export const getContract = (address) => {
  if (!address) return undefined
  if (!ethers.isAddress(address)) return undefined
  return contracts[ethers.getAddress(address)]
}

export const generateContract = async (address, abi = RouletteArtifact.abi) => {
  const checksummed = ethers.getAddress(address)
  let retries = 5
  let code = "0x"
  while (retries > 0) {
    code = await getReadProvider().getCode(checksummed)
    if (code !== "0x") break
    await new Promise((resolve) => setTimeout(resolve, 1000))
    retries -= 1
  }
  if (code === "0x") throw new Error("Contract is not deployed")
  const contract = new ethers.Contract(checksummed, abi, getReadProvider())
  contracts[checksummed] = contract
  return contract
}


export const getFactory = async () => {
  if (!VITE_FACTORY_ADDRESS) throw new Error("Missing VITE_FACTORY_ADDRESS")
  const code = await getReadProvider().getCode(VITE_FACTORY_ADDRESS)
  if (code === "0x") {
    const { name } = chainFromId(targetChainId())
    throw new Error(`Factory is not deployed on ${name}`)
  }
  return new ethers.Contract(VITE_FACTORY_ADDRESS, FactoryArtifact.abi, getReadProvider())
}

const waitTx = async (signer, request) => {
  const extra = { ...request }
  if (isLocalChain(targetChainId())) {
    await syncLocalHead()
    extra.nonce = await getLocalRpc().getTransactionCount(await signer.getAddress(), "latest")
  }
  const tx = await signer.sendTransaction(extra)
  const receipt = await tx.wait()
  if (isLocalChain(targetChainId())) {
    writeHead(await getLocalRpc().getBlockNumber())
  }
  return receipt
}

const broadcast = async (signer, method, args, overrides) => {
  const params = args || []
  const extra = { ...(overrides || {}) }
  extra.from = await signer.getAddress()
  let { gasLimit } = extra
  if (!gasLimit) {
    const gas = await method.estimateGas(...params, extra)
    gasLimit = gas * 15n / 10n
  }
  const populated = await method.populateTransaction(...params, { ...extra, gasLimit })
  return waitTx(signer, populated)
}

export const sendTx = async (method, args, overrides) => {
  return broadcast(await getWriteSigner(), method, args, overrides)
}

export const sendWalletTx = async (method, args, overrides) => {
  return broadcast(await getWalletSigner(), method, args, overrides)
}

export const sendPayment = async (to, value) => {
  return waitTx(await getWalletSigner(), { to, value })
}

export const sendSessionPayment = async (to, value) => {
  return waitTx(await getWriteSigner(), { to, value })
}
