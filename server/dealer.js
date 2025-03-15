const express = require("express")

const router = express.Router()


router.get("/dealer/:address", async (req, res, next) => {
  try {
    const { address } = req.params
  } catch (error) {
    next(error)
  }
})
module.exports = router
