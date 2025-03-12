const dotenv = require("dotenv")
dotenv.config()
const hre = require("hardhat")
const PouchDB = require("pouchdb")
const path = require("path")
const express = require("express")
const cors = require("cors")
const { v7 } = require("uuid")

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
    const result = await db.allDocs({ include_docs: true })
    const docs = result.rows.map(row => row.doc)
    const tables = docs.filter(doc => doc.node === "table")

    res.json(tables)
  } catch (error) {
    next(error)
  }
})

app.get("/tables/:id", async (req, res, next) => {
  try {
    const { id } = req.params
    const table = await db.get(id)
    res.json(table)
  } catch (error) {
    next(error)
  }
})


app.post("/tables", async (req, res, next) => {
  try {
    const { name, type } = req.body
    await hre.run("compile")

    // Get the localhost provider
    const provider = new hre.ethers.JsonRpcProvider(process.env.VITE_RPC_URL)
    const signer = await provider.getSigner()

    const Contract = await hre.ethers.getContractFactory(type, signer)
    const contract = await Contract.deploy()
    await contract.waitForDeployment()
    const address = await contract.getAddress()
    const artifact = await hre.artifacts.readArtifact(type)
    const abi = artifact.abi

    const id = v7()
    await db.put({
      _id: id,
      id,
      node: "table",
      name,
      type,
      address,
      abi,
      createdAt: new Date().toISOString()
    })

    const table = await db.get(id)
    res.json(table)
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

