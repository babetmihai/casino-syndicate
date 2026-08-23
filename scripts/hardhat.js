const http = require("http")
const { spawn } = require("child_process")
const { envName, envFile, loadTargetEnv, readEnvFile, run, networkName, root } = require("./env")

const children = []

process.stdout.setMaxListeners(32)
process.stderr.setMaxListeners(32)

const pingRpc = (rpcUrl) => new Promise((resolve, reject) => {
  const url = new URL(rpcUrl)
  const req = http.request({
    hostname: url.hostname,
    port: url.port || 8545,
    path: url.pathname,
    method: "POST",
    headers: { "content-type": "application/json" }
  }, (res) => {
    res.resume()
    resolve()
  })
  req.on("error", reject)
  req.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }))
  req.end()
})

const waitForRpc = async (rpcUrl, timeoutMs = 30000) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      await pingRpc(rpcUrl)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error(`Hardhat RPC did not start at ${rpcUrl}`)
}

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM")
  }
}

const deployContracts = (name) => {
  loadTargetEnv(name)
  if (name !== "hardhat" && !process.env.PRIVATE_KEY) {
    throw new Error(`Set PRIVATE_KEY in .env.${name}`)
  }

  const file = envFile(name)
  const fresh = process.argv.includes("--fresh")
  run("npx", ["hardhat", "compile"])

  let factory = readEnvFile(file).VITE_FACTORY_ADDRESS
  if (name === "hardhat" || fresh) factory = undefined
  if (!factory) {
    run("npx", ["hardhat", "run", "scripts/deploy.js", "--network", networkName(name)])
    factory = readEnvFile(file).VITE_FACTORY_ADDRESS
  } else {
    console.log(`Using existing GameFactory ${factory}`)
  }
  if (!factory) throw new Error(`Missing VITE_FACTORY_ADDRESS after deploy to ${name}`)
  console.log(`GameFactory ${factory}`)
  return factory
}

const startLocal = async () => {
  loadTargetEnv("hardhat")
  const rpcUrl = process.env.RPC_URL
  let started = false
  try {
    await pingRpc(rpcUrl)
    console.log(`Using existing Hardhat node at ${rpcUrl}`)
  } catch {
    console.log("Starting Hardhat node...")
    const child = spawn("npx", ["hardhat", "node"], { cwd: root, stdio: "inherit", env: process.env })
    children.push(child)
    started = true
    child.on("exit", (code) => {
      shutdown()
      process.exit(code || 0)
    })
    await waitForRpc(rpcUrl)
  }
  deployContracts("hardhat")
  console.log("Run npm run vite in another terminal.")
  if (!started) return
  console.log("Hardhat running. Press Ctrl+C to stop.")
}

process.on("SIGINT", () => {
  shutdown()
  process.exit(130)
})
process.on("SIGTERM", shutdown)

const main = async () => {
  const name = envName()
  if (name === "hardhat") {
    await startLocal()
    return
  }
  deployContracts(name)
  console.log(`UI: npm run pages:${name}`)
}

main().catch((error) => {
  console.error(error)
  shutdown()
  process.exit(1)
})
