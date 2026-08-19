const fs = require("fs")
const path = require("path")
const hre = require("hardhat")

async function main() {
  const Factory = await hre.ethers.getContractFactory("GameFactory")
  const factory = await Factory.deploy()
  await factory.waitForDeployment()
  const address = await factory.getAddress()
  const root = path.join(__dirname, "..")
  const logPath = path.join(root, "deploy.log")
  const envPath = path.join(root, ".env.local")
  const envLine = `VITE_FACTORY_ADDRESS=${address}`

  fs.appendFileSync(logPath, `${new Date().toISOString()} ${hre.network.name} GameFactory ${address}\n`)

  let envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : ""
  if (/^VITE_FACTORY_ADDRESS=/m.test(envContents)) {
    envContents = envContents.replace(/^VITE_FACTORY_ADDRESS=.*$/m, envLine)
  } else {
    envContents = `${envContents.replace(/\s*$/, "")}\n${envLine}`.replace(/^\n/, "")
  }
  if (!envContents.endsWith("\n")) envContents += "\n"
  fs.writeFileSync(envPath, envContents)

  console.log(`GameFactory deployed to: ${address}`)
  console.log(`Saved to ${logPath}`)
  console.log(`Wrote VITE_FACTORY_ADDRESS to ${envPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
