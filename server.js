const dotenv = require("dotenv")
dotenv.config()
const hre = require("hardhat")
const PouchDB = require("pouchdb")
const path = require("path")
const express = require("express")
const cors = require("cors")

const { VITE_SERVER_PORT } = process.env


const dbPath = path.join(__dirname, "./db")
const db = new PouchDB(dbPath)

const app = express()
app.use(express.json())
app.use(cors())
app.get("/", (req, res) => {
  res.send("Server is running")
})

app.get("/tables", async (req, res, next) => {
  try {
    const account = req.headers.Authorization?.replace("Bearer ", "")
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

app.get("/tables/:address", async (req, res, next) => {
  try {
    const { address } = req.params
    const table = await db.get(address)
    res.json(table)
  } catch (error) {
    next(error)
  }
})


app.post("/tables", async (req, res, next) => {
  try {
    await hre.run("compile")
    const account = req.headers.Authorization?.replace("Bearer ", "")
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


app.get("/contract-artifact/:type", async (req, res, next) => {
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


app.use((err, req, res, next) => {
  console.log("\n\n")
  console.error(err.stack)
  throw err
})

app.listen(VITE_SERVER_PORT, () => {
  console.log(`Server is running on port ${VITE_SERVER_PORT}`)
})

