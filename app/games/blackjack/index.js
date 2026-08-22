import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import BlackjackArtifact from "artifacts/contracts/Blackjack.sol/Blackjack.json"
import { PHASE, takeCards } from "./cards"
import _ from "lodash"

const blackjackPath = (address) => `games.blackjack.${ethers.getAddress(address)}`

const GAS = {
  deal: 1_200_000n,
  hit: 300_000n,
  stand: 800_000n,
  doubleDown: 400_000n,
  split: 500_000n
}


export const selectBlackjack = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(blackjackPath(address), EMPTY_OBJECT)
}

export const fetchBlackjack = async (address, receipt) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, BlackjackArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const prev = selectBlackjack(address) || {}
  let lastRound = prev.lastRound
  const phase = Number(row.phase)
  const seats = _.map(row.seats || [], toSeat)
  let dealerCount = Number(row.dealerCount)
  let dealerCards = _.take(row.dealerCards || [], dealerCount).map(Number)
  const settledRound = readRound(contract, receipt) || (phase === PHASE.Betting ? await loadLastRound(contract, account) : undefined)
  if (settledRound) {
    let roundSeats = seats
    if (!hasSeatCards(roundSeats) && hasSeatCards(prev.seats)) roundSeats = prev.seats
    if (!hasSeatCards(roundSeats)) roundSeats = (lastRound || {}).seats
    lastRound = {
      ...settledRound,
      seats: roundSeats
    }
    if (dealerCount === 0 && settledRound.dealerCards.length > 0) {
      dealerCount = settledRound.dealerCards.length
      dealerCards = settledRound.dealerCards
    }
  }
  const shownSeats = hasSeatCards(seats) ? seats : ((lastRound || {}).seats || seats)
  actions.update(blackjackPath(address), {
    memberShares: formatEth(row.memberShares),
    totalBalance: formatEth(row.totalBalance),
    minBet: formatEth(row.minBet),
    maxBet: formatEth(row.maxBet),
    lastWithdrawAt: Number(row.lastWithdrawAt),
    owner,
    phase,
    currentSeat: Number(row.currentSeat),
    currentHand: Number(row.currentHand),
    dealerCount,
    dealerCards,
    seats: shownSeats,
    lastRound
  })
}

export const dealBlackjack = async (address, bets) => {
  const checksummed = ethers.getAddress(address)
  const contract = await generateContract(checksummed, BlackjackArtifact.abi)
  const values = bets.map((bet) => parseEth(bet || 0))
  const value = values.reduce((sum, amount) => sum + amount, 0n)
  actions.update(blackjackPath(checksummed), { acting: true })
  try {
    const receipt = await sendTx(contract.deal, [values], { value, gasLimit: GAS.deal })
    await fetchBlackjack(checksummed, receipt)
  } finally {
    actions.update(blackjackPath(checksummed), { acting: false })
  }
}

export const hitBlackjack = async (address) => {
  return playBlackjack(address, "hit")
}

export const standBlackjack = async (address) => {
  return playBlackjack(address, "stand")
}

export const doubleBlackjack = async (address) => {
  const { seats = [], currentSeat, currentHand } = selectBlackjack(address) || {}
  const { hands = [] } = seats[currentSeat] || {}
  const { bet } = hands[currentHand] || {}
  return playBlackjack(address, "doubleDown", parseEth(bet))
}

export const splitBlackjack = async (address) => {
  const { seats = [], currentSeat, currentHand } = selectBlackjack(address) || {}
  const { hands = [] } = seats[currentSeat] || {}
  const { bet } = hands[currentHand] || {}
  return playBlackjack(address, "split", parseEth(bet))
}

export const depositBlackjackShares = async ({ balance }, address) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  await sendWalletTx(contract.depositShares, [], {
    value: parseEth(balance)
  })
  await fetchBlackjack(address)
}

export const withdrawBlackjackShares = async ({ balance }, address) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  await sendWalletTx(contract.withdrawShares, [parseEth(balance)])
  await fetchBlackjack(address)
}


const playBlackjack = async (address, method, value) => {
  const checksummed = ethers.getAddress(address)
  if ((selectBlackjack(checksummed) || {}).acting) return
  actions.update(blackjackPath(checksummed), { acting: true })
  try {
    const contract = await generateContract(checksummed, BlackjackArtifact.abi)
    let overrides = { gasLimit: GAS[method] }
    if (value) overrides = { ...overrides, value }
    const receipt = await sendTx(contract[method], [], overrides)
    await fetchBlackjack(checksummed, receipt)
  } finally {
    actions.update(blackjackPath(checksummed), { acting: false })
  }
}

const loadLastRound = async (contract, account) => {
  const logs = await contract.queryFilter(contract.filters.Settled(), -16)
  const latest = _.last(logs)
  if (!latest) return
  const paidLogs = await contract.queryFilter(contract.filters.Paid(), latest.blockNumber, latest.blockNumber)
  const mine = _.filter(paidLogs, (log) => {
    if (log.transactionHash !== latest.transactionHash) return false
    if (!account) return false
    return ethers.getAddress(log.args.player) === ethers.getAddress(account)
  })
  return fromSettled(latest.args, mine, latest.transactionHash)
}

const readRound = (contract, receipt) => {
  if (!receipt) return
  const { logs = [] } = receipt
  let settled
  const mine = []
  const { account } = selectAuth() || {}
  for (const log of logs) {
    let parsed
    try {
      parsed = contract.interface.parseLog(log)
    } catch {
      continue
    }
    const { name, args = {} } = parsed || {}
    if (name === "Settled") {
      settled = args
    }
    if (name === "Paid") {
      if (!account) continue
      if (ethers.getAddress(args.player) !== ethers.getAddress(account)) continue
      mine.push({ args })
    }
  }
  if (!settled) return
  return fromSettled(settled, mine, receipt.hash)
}

const fromSettled = (args, mine, id) => {
  const payoutWei = mine.reduce((sum, log) => sum + log.args.payout, 0n)
  const wageredWei = mine.reduce((sum, log) => sum + log.args.wagered, 0n)
  return {
    id,
    dealerTotal: Number(args.dealerTotal),
    dealerCount: Number(args.dealerCount),
    dealerCards: _.take(args.dealerCards || [], Number(args.dealerCount)).map(Number),
    payout: formatEth(payoutWei),
    wagered: formatEth(wageredWei),
    paidSeats: _.map(mine, (log) => ({
      seat: Number(log.args.seat),
      payout: formatEth(log.args.payout),
      wagered: formatEth(log.args.wagered)
    }))
  }
}

const toSeat = (row) => {
  const playerRaw = row.player
  let player
  if (playerRaw && playerRaw !== ethers.ZeroAddress) player = ethers.getAddress(playerRaw)
  return {
    player,
    hands: _.map(row.hands || [], toHand)
  }
}

const hasSeatCards = (seats) => _.some(seats || [], (seat) => {
  return _.some((seat || {}).hands || [], (hand) => Number((hand || {}).count) > 0)
})

const toHand = (row) => {
  const count = Number(row.count)
  return {
    bet: formatEth(row.bet),
    status: Number(row.status),
    count,
    cards: takeCards({ cards: _.map(row.cards || [], Number), count })
  }
}
