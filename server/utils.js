const jwt = require("jsonwebtoken")

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  res.locals.account = decoded.account
  next()
}

module.exports = {
  authMiddleware
}
