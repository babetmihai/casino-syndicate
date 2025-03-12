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
    const result = await db.allDocs()
    const docs = result.rows.map(row => row.doc)
    const contracts = docs.filter(doc => doc.node === "table")
    res.json(contracts)
  } catch (error) {
    next(error)
  }
})

app.post("/tables", async (req, res, next) => {
  try {
    const { name, type } = req.body
    // Make sure we're using the correct contract name
    // The contract in the file is named "Contract" not "Roulette"

    const Contract = await hre.ethers.getContractFactory(type)
    const contract = await Contract.deploy()
    await contract.waitForDeployment()
    const address = await contract.getAddress()
    const abi = Contract.interface.format("json")

    const table = await db.put({
      id: address,
      node: "table",
      name,
      type,
      address,
      abi
    })
    res.json(table)
  } catch (error) {
    next(error)
  }
})

app.listen(VITE_SERVER_PORT, () => {
  console.log(`Server is running on port ${VITE_SERVER_PORT}`)
})

