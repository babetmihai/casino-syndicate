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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const minTip = 25000000000n

const deployGas = (factory) => BigInt((factory.bytecode.length - 2) / 2) * 200n + 50000n

const deployWithRetry = async (factory, args, fee) => {
  const overrides = { ...fee, gasLimit: deployGas(factory) }
  let contract
  let lastError
  for (const delay of [0, 2000, 5000]) {
    if (delay) await sleep(delay)
    try {
      contract = fee
        ? await factory.deploy(...args, overrides)
        : await factory.deploy(...args)
      await contract.waitForDeployment()
      lastError = undefined
      break
    } catch (error) {
      lastError = error
      const message = String(error.message || error)
      if (!/Temporary|timeout|429|ECONNRESET|ETIMEDOUT/i.test(message)) throw error
      console.log(`RPC failed, retrying: ${message}`)
    }
  }
  if (!contract) throw lastError
  return contract
}

async function main() {
  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat"
  const Roulette = await hre.ethers.getContractFactory("Roulette")
  const Polygons = await hre.ethers.getContractFactory("Polygons")
  const Factory = await hre.ethers.getContractFactory("GameFactory")

  if (!isLocal) {
    const [signer] = await hre.ethers.getSigners()
    const from = await signer.getAddress()
    const balance = await hre.ethers.provider.getBalance(from)
    if (balance === 0n) {
      throw new Error(`${from} has 0 POL on ${hre.network.name}. Fund it at https://faucet.polygon.technology/`)
    }
  }

  const overrides = isLocal ? undefined : { gasPrice: minTip }
  const roulette = await deployWithRetry(Roulette, [], overrides)
  console.log(`Roulette implementation: ${await roulette.getAddress()}`)
  const polygons = await deployWithRetry(Polygons, [], overrides)
  console.log(`Polygons implementation: ${await polygons.getAddress()}`)
  const factory = await deployWithRetry(Factory, [await roulette.getAddress(), await polygons.getAddress()], overrides)
  const address = await factory.getAddress()
  const root = path.join(__dirname, "..")
  const logPath = path.join(root, "deploy.log")
  const envPath = path.join(root, isLocal ? ".env.hardhat" : `.env.${hre.network.name}`)
  const values = { VITE_FACTORY_ADDRESS: address }
  if (!isLocal) values.VITE_CHAIN_ID = String(hre.network.config.chainId)

  fs.appendFileSync(logPath, `${new Date().toISOString()} ${hre.network.name} Roulette ${await roulette.getAddress()}\n`)
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${hre.network.name} Polygons ${await polygons.getAddress()}\n`)
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${hre.network.name} GameFactory ${address}\n`)
  upsertEnv(envPath, values)

  console.log(`Roulette implementation: ${await roulette.getAddress()}`)
  console.log(`Polygons implementation: ${await polygons.getAddress()}`)
  console.log(`GameFactory deployed to: ${address}`)
  console.log(`Saved to ${logPath}`)
  console.log(`Wrote ${Object.keys(values).join(" ")} to ${envPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
