import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import BlackjackArtifact from "artifacts/contracts/Blackjack.sol/Blackjack.json"
import { takeCards } from "./cards"
import _ from "lodash"

const blackjackPath = (address) => `games.blackjack.${ethers.getAddress(address)}`


export const selectBlackjack = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(blackjackPath(address), EMPTY_OBJECT)
}

export const fetchBlackjack = async (address) => {
  let contract = getContract(address)
  if (!contract) contract = await generateContract(address, BlackjackArtifact.abi)
  const { account } = selectAuth() || {}
  let overrides = {}
  if (account) overrides = { from: account }
  const row = await contract.getTable.staticCall(overrides)
  const ownerRaw = row.owner
  let owner
  if (ownerRaw && ownerRaw !== ethers.ZeroAddress) owner = ethers.getAddress(ownerRaw)
  const seats = _.map(row.seats || [], toSeat)
  let dealerCount = Number(row.dealerCount)
  let dealerCards = _.take(row.dealerCards || [], dealerCount).map(Number)
  const prev = selectBlackjack(address) || {}
  let lastRound = prev.lastRound
  const phase = Number(row.phase)
  if (phase === 0) {
    const logs = await contract.queryFilter(contract.filters.Settled(), -16)
    const latest = _.last(logs)
    if (latest) {
      const paidLogs = await contract.queryFilter(contract.filters.Paid(), latest.blockNumber, latest.blockNumber)
      const mine = _.filter(paidLogs, (log) => {
        if (log.transactionHash !== latest.transactionHash) return false
        if (!account) return false
        return ethers.getAddress(log.args.player) === ethers.getAddress(account)
      })
      const payoutWei = mine.reduce((sum, log) => sum + log.args.payout, 0n)
      const wageredWei = mine.reduce((sum, log) => sum + log.args.wagered, 0n)
      const settledCards = _.take(latest.args.dealerCards || [], Number(latest.args.dealerCount)).map(Number)
      let roundSeats = seats
      if (!hasSeatCards(roundSeats) && hasSeatCards(prev.seats)) roundSeats = prev.seats
      if (!hasSeatCards(roundSeats)) roundSeats = (lastRound || {}).seats
      lastRound = {
        id: latest.transactionHash,
        dealerTotal: Number(latest.args.dealerTotal),
        dealerCount: Number(latest.args.dealerCount),
        dealerCards: settledCards,
        payout: formatEth(payoutWei),
        wagered: formatEth(wageredWei),
        paidSeats: _.map(mine, (log) => ({
          seat: Number(log.args.seat),
          payout: formatEth(log.args.payout),
          wagered: formatEth(log.args.wagered)
        })),
        seats: roundSeats
      }
      if (dealerCount === 0 && settledCards.length > 0) {
        dealerCount = settledCards.length
        dealerCards = settledCards
      }
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
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const values = bets.map((bet) => parseEth(bet || 0))
  const value = values.reduce((sum, amount) => sum + amount, 0n)
  const receipt = await sendTx(contract.deal, [values], { value })
  await fetchBlackjack(address)
  return readRound(contract, receipt)
}

export const hitBlackjack = async (address) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const receipt = await sendTx(contract.hit, [])
  await fetchBlackjack(address)
  return readRound(contract, receipt)
}

export const standBlackjack = async (address) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const receipt = await sendTx(contract.stand, [])
  await fetchBlackjack(address)
  return readRound(contract, receipt)
}

export const doubleBlackjack = async (address, amount) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const receipt = await sendTx(contract.doubleDown, [], { value: parseEth(amount) })
  await fetchBlackjack(address)
  return readRound(contract, receipt)
}

export const splitBlackjack = async (address, amount) => {
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const receipt = await sendTx(contract.split, [], { value: parseEth(amount) })
  await fetchBlackjack(address)
  return readRound(contract, receipt)
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

const readRound = (contract, receipt) => {
  const { logs = [] } = receipt || {}
  let settled
  let paid
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log)
      const { name, args = {} } = parsed || {}
      if (name === "Settled") {
        settled = {
          dealerTotal: Number(args.dealerTotal),
          dealerCount: Number(args.dealerCount),
          dealerCards: _.take(args.dealerCards || [], Number(args.dealerCount)).map(Number)
        }
      }
      if (name === "Paid") {
        paid = {
          player: ethers.getAddress(args.player),
          seat: Number(args.seat),
          wagered: formatEth(args.wagered),
          payout: formatEth(args.payout)
        }
      }
    } catch {
      // ignore logs from other contracts
    }
  }
  if (!settled) return
  return { ...settled, paid }
}
