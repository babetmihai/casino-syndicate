const jwt = require("jsonwebtoken")
const ethers = require("ethers")
const { v7 } = require("uuid")
const NodeCache = require("node-cache")
const express = require("express")

const router = express.Router()

const cache = new NodeCache({
  stdTTL: 100, // Default TTL in seconds (0 = no expiration)
  checkperiod: 120 // How often to check for expired items (seconds)
})


router.post("/auth/nonce", async (req, res) => {
  const { account } = req.body
  const nonce = v7()
  await cache.set(`nonce:${account}`, nonce)
  res.json({ nonce })
})

router.post("/auth/login", async (req, res) => {
  const { account, signature } = req.body
  const nonce = await cache.get(`nonce:${account}`)
  const signerAddress = ethers.verifyMessage(nonce, signature)
  if (signerAddress !== account) {
    return res.status(401).json({ error: "Invalid signature" })
  }
  const token = jwt.sign({ account }, process.env.JWT_SECRET)
  res.json({ token })
})

router.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  res.locals.account = decoded?.account
  next()
})

module.exports = router
