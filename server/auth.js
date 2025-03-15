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
  const message = `I am signing my message to login to the app. My address is ${account}. My nonce is ${nonce}.`
  const messageHash = ethers.utils.solidityPackedKeccak256(
    ["address", "uint256", "string"],
    [account, nonce, message]
  )
  const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature)
  if (recoveredAddress !== account) {
    return res.status(401).json({ error: "Invalid signature" })
  }
  const token = jwt.sign({ account }, process.env.JWT_SECRET)
  res.json({ token })
})

module.exports = router
