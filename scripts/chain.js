require("dotenv").config()

const { spawn } = require("child_process")
const http = require("http")
const path = require("path")

const root = path.join(__dirname, "..")
const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545"
const children = []


const pingRpc = () => new Promise((resolve, reject) => {
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

const waitForRpc = async (timeoutMs = 30000) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      await pingRpc()
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error(`Hardhat RPC did not start at ${rpcUrl}`)
}

const spawnNpx = (args) => {
  const child = spawn("npx", args, { cwd: root, stdio: "inherit", env: process.env })
  children.push(child)
  return child
}

const runNpx = (args) => new Promise((resolve, reject) => {
  const child = spawn("npx", args, { cwd: root, stdio: "inherit", env: process.env })
  child.on("exit", (code) => {
    if (code) reject(new Error(`${args.join(" ")} exited ${code}`))
    else resolve()
  })
})

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM")
  }
}

process.on("SIGINT", () => {
  shutdown()
  process.exit(130)
})
process.on("SIGTERM", shutdown)


const main = async () => {
  await runNpx(["hardhat", "compile"])

  let startedChain = false
  try {
    await pingRpc()
    console.log(`Using existing Hardhat node at ${rpcUrl}`)
  } catch {
    console.log("Starting Hardhat node...")
    const chain = spawnNpx(["hardhat", "node"])
    startedChain = true
    chain.on("exit", (code) => {
      shutdown()
      process.exit(code || 0)
    })
    await waitForRpc()
  }

  await runNpx(["hardhat", "run", "scripts/deploy.js", "--network", "localhost"])
  console.log("Contracts deployed. Run npm run ui in another terminal.")

  if (!startedChain) return
  console.log("Chain running. Press Ctrl+C to stop.")
}

main().catch((error) => {
  console.error(error)
  shutdown()
  process.exit(1)
})
