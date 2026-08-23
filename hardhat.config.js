const fs = require("fs")
const { readEnvFile, envFile, loadEnv, root } = require("./scripts/env")

loadEnv(".env.hardhat")
require("@nomicfoundation/hardhat-toolbox")
require("events").EventEmitter.defaultMaxListeners = 32

const account = (key) => key && `0x${key.replace(/^0x/, "")}`

const remoteNetworks = () => {
  const networks = {}
  for (const file of fs.readdirSync(root)) {
    const match = file.match(/^\.env\.([a-z][a-z0-9]*)$/)
    if (!match) continue
    const name = match[1]
    if (name === "hardhat") continue
    const env = readEnvFile(envFile(name))
    const key = account(env.PRIVATE_KEY)
    networks[name] = {
      url: env.RPC_URL,
      chainId: Number(env.VITE_CHAIN_ID),
      timeout: 120000,
      accounts: key ? [key] : []
    }
  }
  return networks
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    localhost: {
      url: process.env.RPC_URL,
      chainId: 1337,
      allowUnlimitedContractSize: true
    },
    ...remoteNetworks()
  }
}
