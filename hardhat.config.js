require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox")
require("events").EventEmitter.defaultMaxListeners = 32

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: process.env.RPC_URL,
      chainId: 1337
    }
  }
}
