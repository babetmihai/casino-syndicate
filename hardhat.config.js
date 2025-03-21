
require("dotenv").config()
require("@nomicfoundation/hardhat-toolbox")
// or require("@nomiclabs/hardhat-waffle"); for older versions

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337 // Standard local chain ID
    },
    localhost: {
      url: process.env.RPC_URL,
      chainId: 1337 // Local network
    }
  }
}
