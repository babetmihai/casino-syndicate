import { ethers } from "ethers"

const contracts = {}
let provider

export const getProvider = () => {
  if (!provider) {
    provider = new ethers.BrowserProvider(window.ethereum)
  }
  return provider
}


export const getContract = (address) => {
  return contracts[address]
}

export const setContract = (address, contract) => {
  contracts[address] = contract
}

export const clearContracts = () => {
  contracts = {}
}


export const generateContract = async (address, abi) => {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = getProvider()
  const signer = await provider.getSigner()
  let retries = 5
  while (retries > 0) {
    const code = await provider.getCode(address)
    if (code !== "0x") break
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
    retries--
  }
  const contract = new ethers.Contract(address, abi, signer)
  contracts[address] = contract
  return contract
}
