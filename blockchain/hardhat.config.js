const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")

const root = __dirname
const envFile = (name) => path.join(root, `.env.${name}`)
const parseEnv = (name) => {
  const file = envFile(name)
  if (!fs.existsSync(file)) return {}
  return dotenv.parse(fs.readFileSync(file))
}

dotenv.config({ path: envFile("development") })
const amoy = parseEnv("amoy")
const account = (key) => key && `0x${key.replace(/^0x/, "")}`

require("@nomicfoundation/hardhat-toolbox")
require("events").EventEmitter.defaultMaxListeners = 32

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
    amoy: {
      url: amoy.RPC_URL,
      chainId: Number(amoy.VITE_CHAIN_ID),
      timeout: 120000,
      accounts: account(amoy.PRIVATE_KEY) ? [account(amoy.PRIVATE_KEY)] : []
    }
  }
}
