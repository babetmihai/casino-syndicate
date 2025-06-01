const PouchDB = require("pouchdb")
const path = require("path")

const db = new PouchDB(path.join(__dirname, "./database"))

module.exports = db
