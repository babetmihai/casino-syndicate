import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const { PRIVATE_KEY, MUMBAI_RPC_URL } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.20", // Use a recent Solidity version
  networks: {
    hardhat: {
      chainId: 1337,
    },
    mumbai: {
      url: MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : [],
    },
  },
};

export default config;