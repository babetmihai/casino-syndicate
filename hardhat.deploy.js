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
  const config = { abi, address }

  const publicDir = path.resolve(__dirname, "./app/public")
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  const configPath = path.resolve(publicDir, `${VITE_CONTRACT_NAME}.json`)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(`Contract address: ${address}`)
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })