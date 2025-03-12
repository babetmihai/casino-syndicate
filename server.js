const hre = require("hardhat")
const PouchDB = require("pouchdb")
const path = require("path")
const express = require("express")
const { v7 } = require("uuid")

const PORT = 3000


const dbPath = path.join(__dirname, "./db")
const db = new PouchDB(dbPath)

const app = express()
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Server is running")
})

app.get("/contracts", async (req, res, next) => {
  try {
    const result = await db.allDocs()
    const docs = result.rows.map(row => row.doc)
    const contracts = docs.filter(doc => doc.node === "contract")
    res.json(contracts)
  } catch (error) {
    next(error)
  }
})

app.post("/contracts", async (req, res, next) => {
  try {
    const { name, type } = req.body
    const Contract = await hre.ethers.getContractFactory(type)
    const contract = await Contract.deploy()
    await contract.waitForDeployment()
    const address = await contract.getAddress()
    const abi = Contract.abi

    const id = v7()
    const table = await db.put({
      id,
      node: "contract",
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

