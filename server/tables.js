const express = require("express")
const PouchDB = require("pouchdb")
const path = require("path")
const hre = require("hardhat")
const { authMiddleware } = require("./utils")
const db = new PouchDB(path.join(__dirname, "../db"))


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


router.get("/tables", authMiddleware, async (req, res, next) => {
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

router.post("/tables", authMiddleware, async (req, res, next) => {
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


router.get("/tables/artifact/:type", authMiddleware, async (req, res, next) => {
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


module.exports = router