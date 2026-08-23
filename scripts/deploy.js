const fs = require("fs")
const path = require("path")
const hre = require("hardhat")

const upsertEnv = (filePath, values) => {
  let contents = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : ""
  for (const key of Object.keys(values)) {
    const line = `${key}=${values[key]}`
    const pattern = new RegExp(`^${key}=.*$`, "m")
    if (pattern.test(contents)) {
      contents = contents.replace(pattern, line)
    } else {
      contents = `${contents.replace(/\s*$/, "")}\n${line}`.replace(/^\n/, "")
    }
  }
  if (!contents.endsWith("\n")) contents += "\n"
  fs.writeFileSync(filePath, contents)
}

async function main() {
  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat"
  if (!isLocal) {
    const [signer] = await hre.ethers.getSigners()
    const from = await signer.getAddress()
    const balance = await hre.ethers.provider.getBalance(from)
    if (balance === 0n) {
      throw new Error(`${from} has 0 POL on ${hre.network.name}. Fund it at https://faucet.polygon.technology/`)
    }
  }

  const Factory = await hre.ethers.getContractFactory("GameFactory")
  const factory = await Factory.deploy()
  await factory.waitForDeployment()
  const address = await factory.getAddress()
  const root = path.join(__dirname, "..")
  const logPath = path.join(root, "deploy.log")
  const envPath = path.join(root, isLocal ? ".env.local" : ".env.production")
  const values = { VITE_FACTORY_ADDRESS: address }
  if (!isLocal) values.VITE_CHAIN_ID = String(hre.network.config.chainId)

  fs.appendFileSync(logPath, `${new Date().toISOString()} ${hre.network.name} GameFactory ${address}\n`)
  upsertEnv(envPath, values)

  console.log(`GameFactory deployed to: ${address}`)
  console.log(`Saved to ${logPath}`)
  console.log(`Wrote ${Object.keys(values).join(" ")} to ${envPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
