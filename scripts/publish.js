const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const root = path.join(__dirname, "..")
require("dotenv").config({ path: path.join(root, ".env") })
require("dotenv").config({ path: path.join(root, ".env.local") })

const AMOY_CHAIN_ID = 80002
const worktree = path.join(root, ".gh-pages")
const productionEnv = path.join(root, ".env.production")
const distDir = path.join(root, "dist")

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

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {}
  const values = {}
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    values[match[1]] = match[2]
  }
  return values
}

const pagesUrl = () => {
  const remote = run("git", ["remote", "get-url", "origin"], { capture: true })
  const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/)
  if (!match) return "GitHub Pages (gh-pages branch)"
  return `https://${match[1]}.github.io/${match[2]}/`
}

const clearDir = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git") continue
    fs.rmSync(path.join(dir, name), { recursive: true, force: true })
  }
}

const publishPages = () => {
  if (fs.existsSync(worktree)) {
    run("git", ["worktree", "remove", "--force", worktree])
  }

  run("git", ["fetch", "origin"])
  const remotePages = run("git", ["ls-remote", "--heads", "origin", "gh-pages"], { capture: true })
  if (remotePages) {
    run("git", ["worktree", "add", "--force", "-B", "gh-pages", worktree, "origin/gh-pages"])
  } else {
    run("git", ["worktree", "add", "--force", "-B", "gh-pages", worktree, "HEAD"])
  }

  clearDir(worktree)
  fs.cpSync(distDir, worktree, { recursive: true })
  fs.writeFileSync(path.join(worktree, ".nojekyll"), "")

  run("git", ["add", "-A"], { cwd: worktree })
  const dirty = run("git", ["status", "--porcelain"], { cwd: worktree, capture: true })
  if (dirty) {
    run("git", ["commit", "-m", "Publish GitHub Pages"], { cwd: worktree })
  }
  run("git", ["push", "origin", "gh-pages"], { cwd: worktree })
  run("git", ["worktree", "remove", "--force", worktree])
}

const main = async () => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY in .env.local to an Amoy account funded with POL")
  }

  const fresh = process.argv.includes("--fresh")
  run("npx", ["hardhat", "compile"])

  let factory = readEnvFile(productionEnv).VITE_FACTORY_ADDRESS
  if (fresh) factory = undefined
  if (!factory) {
    run("npx", ["hardhat", "run", "scripts/deploy.js", "--network", "amoy"])
    factory = readEnvFile(productionEnv).VITE_FACTORY_ADDRESS
  } else {
    console.log(`Using existing GameFactory ${factory}`)
  }
  if (!factory) throw new Error("Missing VITE_FACTORY_ADDRESS after deploy")

  run("npx", ["vite", "build"], {
    env: {
      VITE_FACTORY_ADDRESS: factory,
      VITE_CHAIN_ID: String(AMOY_CHAIN_ID)
    }
  })

  publishPages()

  const url = pagesUrl()
  console.log(`GameFactory ${factory}`)
  console.log(`Explorer https://amoy.polygonscan.com/address/${factory}`)
  console.log(`App ${url}`)
  console.log(`Set GitHub Pages source to the gh-pages branch if this is the first publish`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})



