const fs = require("fs")
const path = require("path")
const { envName, envFile, loadTargetEnv, readEnvFile, run, root, canPublishPages } = require("./env")

const worktree = path.join(root, ".gh-pages")
const distDir = path.join(root, "dist")

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

const main = () => {
  const name = envName()
  if (!canPublishPages(name)) throw new Error("GitHub Pages is for --amoy")
  loadTargetEnv(name)

  const factory = readEnvFile(envFile(name)).VITE_FACTORY_ADDRESS
  if (!factory) {
    throw new Error(`Missing VITE_FACTORY_ADDRESS in .env.${name}. Run npm run hardhat:${name} first`)
  }

  run("npx", ["hardhat", "compile"])
  run("npx", ["vite", "build", "--mode", name], {
    env: {
      VITE_FACTORY_ADDRESS: factory,
      VITE_CHAIN_ID: process.env.VITE_CHAIN_ID
    }
  })
  publishPages()

  console.log(`GameFactory ${factory}`)
  console.log(`App ${pagesUrl()}`)
  console.log(`Set GitHub Pages source to the gh-pages branch if this is the first publish`)
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
