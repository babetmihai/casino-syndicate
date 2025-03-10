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

  // Update the .env file with the contract address
  const envPath = path.resolve(__dirname, '.env')
  let envContent = fs.readFileSync(envPath, 'utf8')
  
  // Update or add the contract address in .env
  if (envContent.includes('VITE_CONTRACT_ADDRESS=')) {
    envContent = envContent.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${address}`)
  } else {
    envContent += `\nVITE_CONTRACT_ADDRESS=${address}`
  }
  // Update or add the ABI in .env
  if (envContent.includes('VITE_CONTRACT_ABI=')) {
    envContent = envContent.replace(/VITE_CONTRACT_ABI=.*/g, `VITE_CONTRACT_ABI=${JSON.stringify(abi)}`)
  } else {
    envContent += `\nVITE_CONTRACT_ABI=${JSON.stringify(abi)}`
  }
  
  fs.writeFileSync(envPath, envContent)
  

  
  console.log(`Contract address: ${address}`)
  console.log(`Updated .env file with contract address`)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })