const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const dotenv = require("dotenv")

const root = path.join(__dirname, "..")

const TARGETS = {
  hardhat: { network: "localhost", pages: false },
  amoy: { network: "amoy", pages: true }
}

const envName = () => {
  const flag = process.argv.find((arg) => /^--[a-z][a-z0-9]*$/.test(arg) && arg !== "--fresh")
  const name = flag ? flag.slice(2) : "hardhat"
  if (!TARGETS[name]) throw new Error(`Unknown env --${name}. Use --hardhat or --amoy`)
  return name
}

const networkName = (name) => TARGETS[name].network
const canPublishPages = (name) => TARGETS[name].pages
const envFile = (name) => path.join(root, `.env.${name}`)

const loadEnv = (...files) => {
  for (const file of files) {
    dotenv.config({ path: path.join(root, file) })
  }
}

const loadTargetEnv = (name) => {
  const file = envFile(name)
  if (!fs.existsSync(file)) throw new Error(`Missing ${path.basename(file)}`)
  dotenv.config({ path: file, override: true })
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

module.exports = { root, TARGETS, envName, envFile, loadEnv, loadTargetEnv, readEnvFile, run, networkName, canPublishPages }
