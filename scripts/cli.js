const fs = require("fs")
const http = require("http")
const path = require("path")
const { spawn, spawnSync } = require("child_process")
const dotenv = require("dotenv")

const root = path.join(__dirname, "..")
const envPath = (name) => path.join(root, `.env.${name}`)

const loadEnv = (name) => {
  const file = envPath(name)
  if (!fs.existsSync(file)) throw new Error(`Missing .env.${name}`)
  dotenv.config({ path: file, override: true })
}

const readEnv = (name) => {
  const file = envPath(name)
  if (!fs.existsSync(file)) return {}
  const values = {}
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) values[match[1]] = match[2]
  }
  return values
}

const run = (command, args, opts = {}) => {
  const result = spawnSync(command, args, {
    cwd: opts.cwd || root,
    env: { ...process.env, ...opts.env },
    encoding: "utf8",
    stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  })
  if (result.status) {
    const detail = opts.capture ? result.stderr : ""
    throw new Error(`${[command, ...args].join(" ")} exited ${result.status}${detail ? `\n${detail}` : ""}`)
  }
  if (opts.capture) return (result.stdout || "").trim()
}

const requireAmoy = () => {
  if (!process.argv.includes("--amoy")) throw new Error("Pass --amoy")
  return "amoy"
}

const deploy = (name, network) => {
  loadEnv(name)
  if (name !== "development" && !process.env.PRIVATE_KEY) {
    throw new Error(`Set PRIVATE_KEY in .env.${name}`)
  }

  const fresh = process.argv.includes("--fresh")
  run("npx", ["hardhat", "compile"])

  let factory = readEnv(name).VITE_FACTORY_ADDRESS
  if (name === "development" || fresh) factory = undefined
  if (!factory) {
    run("npx", ["hardhat", "run", "scripts/deploy.js", "--network", network])
    factory = readEnv(name).VITE_FACTORY_ADDRESS
  } else {
    console.log(`Using existing GameFactory ${factory}`)
  }
  if (!factory) throw new Error(`Missing VITE_FACTORY_ADDRESS in .env.${name}`)
  console.log(`GameFactory ${factory}`)
  return factory
}

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

const waitForRpc = async (rpcUrl) => {
  const started = Date.now()
  while (Date.now() - started < 30000) {
    try {
      await pingRpc(rpcUrl)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error(`Hardhat RPC did not start at ${rpcUrl}`)
}

const chain = async () => {
  loadEnv("development")
  const rpcUrl = process.env.RPC_URL
  const children = []
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

  deploy("development", "localhost")
  console.log("Run npm start in another terminal.")
  if (!started) return
  console.log("Hardhat running. Press Ctrl+C to stop.")
}

const pages = () => {
  const name = requireAmoy()
  loadEnv(name)
  const factory = readEnv(name).VITE_FACTORY_ADDRESS
  if (!factory) throw new Error(`Missing VITE_FACTORY_ADDRESS in .env.${name}. Run npm run deploy -- --amoy first`)

  run("npx", ["hardhat", "compile"])
  run("npx", ["vite", "build", "--mode", name], {
    env: {
      VITE_FACTORY_ADDRESS: factory,
      VITE_CHAIN_ID: process.env.VITE_CHAIN_ID
    }
  })

  const worktree = path.join(root, ".gh-pages")
  const distDir = path.join(root, "dist")
  if (fs.existsSync(worktree)) run("git", ["worktree", "remove", "--force", worktree])
  run("git", ["fetch", "origin"])
  const remotePages = run("git", ["ls-remote", "--heads", "origin", "gh-pages"], { capture: true })
  if (remotePages) {
    run("git", ["worktree", "add", "--force", "-B", "gh-pages", worktree, "origin/gh-pages"])
  } else {
    run("git", ["worktree", "add", "--force", "-B", "gh-pages", worktree, "HEAD"])
  }

  for (const name of fs.readdirSync(worktree)) {
    if (name === ".git") continue
    fs.rmSync(path.join(worktree, name), { recursive: true, force: true })
  }
  fs.cpSync(distDir, worktree, { recursive: true })
  fs.writeFileSync(path.join(worktree, ".nojekyll"), "")
  run("git", ["add", "-A"], { cwd: worktree })
  const dirty = run("git", ["status", "--porcelain"], { cwd: worktree, capture: true })
  if (dirty) run("git", ["commit", "-m", "Publish GitHub Pages"], { cwd: worktree })
  run("git", ["push", "origin", "gh-pages"], { cwd: worktree })
  run("git", ["worktree", "remove", "--force", worktree])

  const remote = run("git", ["remote", "get-url", "origin"], { capture: true })
  const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/)
  const url = match ? `https://${match[1]}.github.io/${match[2]}/` : "GitHub Pages (gh-pages branch)"
  console.log(`GameFactory ${factory}`)
  console.log(`App ${url}`)
}

const command = process.argv[2]
const commands = {
  chain,
  deploy: () => {
    deploy(requireAmoy(), "amoy")
    console.log("UI: npm run pages -- --amoy")
  },
  pages
}

if (!commands[command]) {
  console.error("Usage: node scripts/cli.js chain|deploy|pages")
  process.exit(1)
}

Promise.resolve()
  .then(() => commands[command]())
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
