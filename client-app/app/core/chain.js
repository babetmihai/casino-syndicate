import { actions } from "./store"

export const LOCAL_CHAIN_ID = 1337

const chainActions = actions.create("chain")

const CHAINS = {
  1: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    hexId: "0x1",
    rpcUrl: "https://ethereum-rpc.publicnode.com"
  },
  10: {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    hexId: "0xa",
    rpcUrl: "https://mainnet.optimism.io"
  },
  137: {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    hexId: "0x89",
    rpcUrl: "https://polygon.drpc.org"
  },
  1337: {
    id: 1337,
    name: "Localhost 1337",
    symbol: "ETH",
    hexId: "0x539",
    rpcUrl: "http://127.0.0.1:8545"
  },
  8453: {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    hexId: "0x2105",
    rpcUrl: "https://mainnet.base.org"
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    hexId: "0xa4b1",
    rpcUrl: "https://arb1.arbitrum.io/rpc"
  },
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    symbol: "POL",
    hexId: "0x13882",
    rpcUrl: "https://polygon-amoy-bor-rpc.publicnode.com"
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    symbol: "ETH",
    hexId: "0x14a34",
    rpcUrl: "https://sepolia.base.org"
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    symbol: "ETH",
    hexId: "0xaa36a7",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com"
  }
}


export const targetChainId = () => {
  const { VITE_CHAIN_ID } = import.meta.env
  if (VITE_CHAIN_ID) return Number(VITE_CHAIN_ID)
  return LOCAL_CHAIN_ID
}

export const chainFromId = (chainId) => {
  const id = Number(chainId)
  const chain = CHAINS[id]
  if (chain) {
    return { chainId: id, ...chain }
  }
  return {
    id,
    chainId: id,
    name: `Chain ${id}`,
    symbol: "ETH",
    hexId: `0x${id.toString(16)}`,
    rpcUrl: undefined
  }
}

export const isLocalChain = (chainId) => Number(chainId) === LOCAL_CHAIN_ID

export const selectChain = () => chainActions.get()

export const selectNativeSymbol = () => {
  const { symbol } = selectChain()
  if (symbol) return symbol
  const { symbol: fallback } = chainFromId(targetChainId())
  return fallback
}

export const setChain = (chainId) => {
  chainActions.set(chainFromId(chainId))
}

export const initChain = () => {
  setChain(targetChainId())
}
