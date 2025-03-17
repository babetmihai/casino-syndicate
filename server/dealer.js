const NodeCache = require("node-cache")

const cache = new NodeCache()


const STATUSES = {
  PENDING: "pending",
  PROGRESS: "progress",
  CLOSED: "closed"
}

const registerBet = (account, address, bet) => {
  const { status = STATUSES.PENDING } = cache.get(`game.${address}`) || {}
  switch (status) {
    case STATUSES.PENDING:

      cache.set(`bets.${address}.${account}`, bet)
      break
    case STATUSES.PROGRESS:
      cache.set(`bets.${address}.${account}`, bet)
      break
    case STATUSES.CLOSED:
      throw new Error("Game is closed")
  }
}

const startGame = (address) => {
  cache.set(`status.${address}`, { status: STATUSES.PROGRESS, bets: [] })
  setTimeout(() => {
    endGame(address)
  }, 30)
}


const endGame = (address) => {
  cache.set(`status.${address}`, { status: STATUSES.CLOSED, bets: [] })
}


module.exports = {
  registerBet,
  startGame,
  endGame
}
