const express = require("express")
const hre = require("hardhat")
const db = require("./db")
const { ethers } = require("ethers")

const router = express.Router()


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


// TODO: implement  Commit-Reveal Scheme


router.post("/tables/:address/bets", async (req, res, next) => {
  try {
    const { RPC_URL, DEALER_PRIVATE_KEY } = process.env
    const { account } = res.locals
    const { address } = req.params
    const { bets } = req.body
    const table = await db.get(address)
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(DEALER_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(table.address, table.abi, wallet)
    const tx = await contract.postDealerBet(account, bets.map(bet => bet && ethers.parseEther(bet.toString())), {
      gasLimit: 500000
    })
    // Wait for the transaction to be mined
    const receipt = await tx.wait(1)
    const winningNumberEvent = receipt.logs
      .map(log => contract.interface.parseLog(log))
      .find(event => event && event.name === "WinningNumber")


    if (!winningNumberEvent) throw new Error("no_event_found")
    const [number, totalBetAmount, winningAmount, playerBalance] = winningNumberEvent.args
    res.json({
      number: Number(number),
      totalBetAmount: ethers.formatEther(totalBetAmount),
      winningAmount: ethers.formatEther(winningAmount),
      playerBalance: ethers.formatEther(playerBalance),
      txHash: tx.hash
    })
  } catch (error) {
    next(error)
  }
})
module.exports = router