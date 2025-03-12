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

app.get("/tables", async (req, res, next) => {
  try {
    const result = await db.allDocs()
    const docs = result.rows.map(row => row.doc)
    const tables = docs.filter(doc => doc.type === "table")
    res.json(tables)
  } catch (error) {
    next(error)
  }
})

app.post("/tables", async (req, res, next) => {
  try {
    const { name, address, abi } = req.body
    const id = v7()
    const table = await db.put({
      id,
      type: "table",
      name,
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

