const path = require("path")

require("dotenv").config()
require("dotenv").config({ path: path.join(__dirname, ".env.local") })
require("@nomicfoundation/hardhat-toolbox")
require("events").EventEmitter.defaultMaxListeners = 32

const deployerKey = process.env.PRIVATE_KEY && `0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 50
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
      url: process.env.AMOY_RPC_URL || "https://polygon-amoy-bor-rpc.publicnode.com",
      chainId: 80002,
      timeout: 120000,
      accounts: deployerKey ? [deployerKey] : []
    }
  }
}
