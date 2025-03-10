/* eslint-disable */
require("dotenv").config()
const { ethers } = require("hardhat")
const fs = require("fs")
const path = require("path")


const { VITE_CONTRACT_NAME } = process.env

async function main() {
  const Contract = await ethers.getContractFactory(VITE_CONTRACT_NAME)
  const contract = await Contract.deploy()
  await contract.waitForDeployment()
  const address = await contract.getAddress()

  const artifactPath = path.resolve(
    __dirname,
    `./artifacts/contracts/${VITE_CONTRACT_NAME}.sol/${VITE_CONTRACT_NAME}.json`
  )
  const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"))
  const publicDir = path.resolve(__dirname, "./app/public")
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  const abiPath = path.resolve(publicDir, `abi.json`)
 
  // Update .env file with the new contract address
  const envPath = path.resolve(__dirname, './.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Replace existing contract address or add it if it doesn't exist
    if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /VITE_CONTRACT_ADDRESS=.*/,
        `VITE_CONTRACT_ADDRESS=${address}`
      );
    } else {
      envContent += `\nVITE_CONTRACT_ADDRESS=${address}`;
    }
  } else {
    envContent = `VITE_CONTRACT_ADDRESS=${address}`;
  }
  
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2))
  console.log(`abi.json written to ${abiPath}`)
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env file with contract address: ${address}`);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })