const express = require("express")
const hre = require("hardhat")
const db = require("./db")
const { ethers } = require("ethers")
const { v7: uuidv7 } = require("uuid")
const router = express.Router()
const { RPC_URL, DEALER_PRIVATE_KEY } = process.env
const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(DEALER_PRIVATE_KEY, provider)


router.get("/tables/:address", async (req, res, next) => {
  try {
    const { address } = req.params
    const table = await db.get(address)
    res.json(table)
  } catch (error) {
    next(error)
  }
})


router.get("/tables", async (req, res, next) => {
  try {
    const { account } = res.locals
    const result = await db.allDocs({ include_docs: true })
    const docs = result.rows.map(row => row.doc)
    const tables = docs.filter(doc => (
      doc.node === "table" &&
      doc.createdBy === account
    ))

    res.json(tables)
  } catch (error) {
    next(error)
  }
})

router.post("/tables", async (req, res, next) => {
  try {
    await hre.run("compile")
    const { account } = res.locals
    const { name, type, abi, address } = req.body

    await db.put({
      _id: address,
      address,
      node: "table",
      name,
      type,
      abi,
      createdBy: account,
      createdAt: new Date().toISOString()
    })

    const table = await db.get(address)
    res.json(table)
  } catch (error) {
    next(error)
  }
})


router.get("/tables/artifact/:type", async (req, res, next) => {
  try {
    await hre.run("compile") // Ensure contracts are compiled
    const { type } = req.params
    const artifact = await hre.artifacts.readArtifact(type)
    res.json({
      abi: artifact.abi,
      bytecode: artifact.bytecode
    })
  } catch (error) {
    next(error)
  }
})

// TODO: move to redis, add bull instad of setTimeout
let isPosting = 0
let isCommiting = false
let isRevealing = false

router.post("/tables/:address/bets", async (req, res, next) => {
  try {
    if (isRevealing) throw new Error("revealing_is_in_progress")
    isPosting ++
    const { account } = res.locals
    const { address } = req.params
    const { bets } = req.body
    const table = await db.get(address)

    const contract = new ethers.Contract(table.address, table.abi, wallet)
    if (!isCommiting) {
      isCommiting = true
      const value = [uuidv7(), address].join("-")
      const hash = ethers.solidityPackedKeccak256(["string"], [value])
      tx = await contract.commit(hash, { gasLimit: 500000 })
      tx.wait()
      tx = await contract.setRevealDeadline(10 * 1000)
      tx.wait()
      setTimeout(async () => {
        isRevealing = true
        while (!isCommiting) {
          await new Promise(resolve => setTimeout(resolve, 1 * 1000))
          if (!isPosting) {
            try {
              tx = await contract.reveal(value)
              await tx.wait()
              isCommiting = false
              isRevealing = false
            } catch {
              // do nothing
            }
          }

        }
      }, 10 * 1000)
    }
    const tx = await contract.postDealerBet(account, bets.map(bet => bet && ethers.parseEther(bet.toString())), {
      gasLimit: 500000
    })
    const receipt = await tx.wait()
    res.json({ txHash: receipt.transactionHash })
  } catch (error) {
    next(error)
  } finally {
    isPosting --
  }
})


module.exports = router