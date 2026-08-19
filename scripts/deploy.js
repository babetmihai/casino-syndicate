const hre = require("hardhat")

async function main() {
  const Factory = await hre.ethers.getContractFactory("RouletteFactory")
  const factory = await Factory.deploy()
  await factory.waitForDeployment()
  const address = await factory.getAddress()
  console.log(`RouletteFactory deployed to: ${address}`)
  console.log("Set VITE_FACTORY_ADDRESS to this address in .env")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
