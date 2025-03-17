const NodeCache = require("node-cache")

const cache = new NodeCache()


const registerBet = (account, address, bet) => {
  cache.set(`${address}.${account}`, bet)
}

const startGame = (address) => {
  const bets = cache.get(address)
  const result = Math.floor(Math.random() * 37)
  const winner = bets.find((bet) => bet.number === result)
  return winner
}


const endGame = (address) => {
  cache.del(address)
}


module.exports = {
  registerBet,
  startGame,
  endGame
}
