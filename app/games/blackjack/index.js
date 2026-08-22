import { ethers } from "ethers"
import { actions } from "app/core/store"
import { EMPTY_OBJECT } from "app/core"
import { generateContract, getContract, sendTx, sendWalletTx } from "app/core/contracts"
import { selectAuth } from "app/core/auth"
import { formatEth, parseEth } from "app/games/roulette/chips"
import BlackjackArtifact from "artifacts/contracts/Blackjack.sol/Blackjack.json"
import { ACTION, PHASE, takeCards } from "./cards"
import { playRound } from "./round"
import _ from "lodash"

const blackjackPath = (address) => `games.blackjack.${ethers.getAddress(address)}`
const dealerPath = (address) => `dealers.${ethers.getAddress(address)}`


export const selectBlackjack = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(blackjackPath(address), EMPTY_OBJECT)
}

export const selectDealer = (address) => {
  if (!address || !ethers.isAddress(address)) return EMPTY_OBJECT
  return actions.get(dealerPath(address), EMPTY_OBJECT)
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
  const prev = selectBlackjack(address) || {}
  let lastRound = prev.lastRound
  const phase = Number(row.phase)
  const liveState = overlayLive(address, phase, prev.live)
  let seats = _.map(row.seats || [], toSeat)
  let dealerCount = Number(row.dealerCount)
  let dealerCards = _.take(row.dealerCards || [], dealerCount).map(Number)
  let currentSeat = Number(row.currentSeat)
  let currentHand = Number(row.currentHand)
  let extra = "0"
  if (liveState) {
    seats = liveState.seats
    dealerCount = liveState.dealerCount
    dealerCards = liveState.dealerCards
    currentSeat = liveState.currentSeat
    currentHand = liveState.currentHand
    extra = liveState.extra
  }
  if (phase === PHASE.Betting) {
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
    phase: liveState ? liveState.phase : phase,
    currentSeat,
    currentHand,
    dealerCount,
    dealerCards,
    seats: shownSeats,
    lastRound,
    deckCommit: row.deckCommit,
    playerSeed: row.playerSeed,
    extra,
    live: phase === PHASE.Acting ? prev.live : undefined
  })
}

export const ensureBlackjackDeck = async (address) => {
  const checksummed = ethers.getAddress(address)
  const { account } = selectAuth() || {}
  let { secret } = selectDealer(checksummed) || {}
  if (!secret) {
    secret = ethers.hexlify(ethers.randomBytes(32))
    actions.set(dealerPath(checksummed), { secret })
  }
  const contract = await generateContract(checksummed, BlackjackArtifact.abi)
  const owner = ethers.getAddress(await contract.createdBy())
  const onChain = await contract.deckCommit()
  const commit = ethers.keccak256(secret)
  if (onChain === commit) return secret
  const isOwner = account && ethers.getAddress(owner) === ethers.getAddress(account)
  if (!isOwner) return secret
  await sendWalletTx(contract.commitDeck, [commit])
  await fetchBlackjack(checksummed)
  return secret
}

export const dealBlackjack = async (address, bets) => {
  const secret = await ensureBlackjackDeck(address)
  const contract = await generateContract(address, BlackjackArtifact.abi)
  const onChain = await contract.deckCommit()
  if (onChain !== ethers.keccak256(secret)) throw new Error("Deck required")
  const { account, session } = selectAuth() || {}
  const { address: payer } = session || {}
  const values = bets.map((bet) => parseEth(bet || 0))
  const value = values.reduce((sum, amount) => sum + amount, 0n)
  const playerSeed = ethers.hexlify(ethers.randomBytes(32))
  await sendTx(contract.deal, [values, playerSeed], { value })
  const live = {
    playerSeed,
    kinds: [],
    bets: _.map(values, (amount) => amount.toString()),
    player: ethers.getAddress(account),
    payer: ethers.getAddress(payer)
  }
  const board = playRound({
    secret,
    playerSeed,
    bets: values,
    player: live.player,
    payer: live.payer,
    kinds: []
  })
  writeLive(address, live, board)
  if (board.phase === PHASE.Betting) {
    return settleBlackjack(address)
  }
  await fetchBlackjack(address)
}

export const hitBlackjack = async (address) => {
  return actBlackjack(address, ACTION.Hit)
}

export const standBlackjack = async (address) => {
  return actBlackjack(address, ACTION.Stand)
}

export const doubleBlackjack = async (address) => {
  return actBlackjack(address, ACTION.Double)
}

export const splitBlackjack = async (address) => {
  return actBlackjack(address, ACTION.Split)
}

export const settleBlackjack = async (address) => {
  const checksummed = ethers.getAddress(address)
  const { live, owner } = selectBlackjack(checksummed) || {}
  const { secret } = selectDealer(checksummed) || {}
  const { account } = selectAuth() || {}
  const board = replayLive(checksummed, live, secret)
  const contract = await generateContract(checksummed, BlackjackArtifact.abi)
  actions.update(blackjackPath(checksummed), { settling: true })
  let nextCommit = ethers.ZeroHash
  let nextSecret
  const isOwner = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  if (isOwner) {
    nextSecret = ethers.hexlify(ethers.randomBytes(32))
    nextCommit = ethers.keccak256(nextSecret)
  }
  try {
    const receipt = await sendTx(contract.settle, [secret, live.kinds, nextCommit], {
      value: board.extra
    })
    if (nextSecret) actions.set(dealerPath(checksummed), { secret: nextSecret })
    actions.update(blackjackPath(checksummed), { live: undefined, settling: false })
    await fetchBlackjack(checksummed)
    return readRound(contract, receipt)
  } finally {
    actions.update(blackjackPath(checksummed), { settling: false })
  }
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


const actBlackjack = async (address, kind) => {
  const checksummed = ethers.getAddress(address)
  const { live, settling } = selectBlackjack(checksummed) || {}
  const { secret } = selectDealer(checksummed) || {}
  if (settling) return
  if (!live) return
  const current = replayLive(checksummed, live, secret)
  if (current.phase === PHASE.Betting) return settleBlackjack(checksummed)
  const kinds = [...(live.kinds || []), kind]
  const nextLive = { ...live, kinds }
  const board = replayLive(checksummed, nextLive, secret)
  writeLive(checksummed, nextLive, board)
  if (board.phase === PHASE.Betting) {
    return settleBlackjack(checksummed)
  }
}

const replayLive = (address, live, secret) => {
  const { playerSeed, kinds = [], bets = [], player, payer } = live || {}
  return playRound({
    secret,
    playerSeed,
    bets: _.map(bets, (amount) => BigInt(amount)),
    player,
    payer,
    kinds
  })
}

const overlayLive = (address, phase, live) => {
  if (phase !== PHASE.Acting) return
  if (!live) return
  const { secret } = selectDealer(address) || {}
  if (!secret) return
  return fromBoard(replayLive(address, live, secret))
}

const writeLive = (address, live, board) => {
  const shown = fromBoard(board)
  actions.update(blackjackPath(address), {
    phase: shown.phase,
    currentSeat: shown.currentSeat,
    currentHand: shown.currentHand,
    dealerCount: shown.dealerCount,
    dealerCards: shown.dealerCards,
    seats: shown.seats,
    extra: shown.extra,
    live
  })
}

const fromBoard = (board) => ({
  phase: board.phase,
  currentSeat: board.currentSeat,
  currentHand: board.currentHand,
  dealerCount: board.dealerCount,
  dealerCards: _.take(board.dealerCards, board.dealerCount),
  seats: _.map(board.seats, toLiveSeat),
  extra: formatEth(board.extra)
})

const toLiveSeat = (seat) => {
  const playerRaw = seat.player
  let player
  if (playerRaw && playerRaw !== ethers.ZeroAddress) player = ethers.getAddress(playerRaw)
  return {
    player,
    hands: _.map(seat.hands || [], (hand) => {
      const count = Number(hand.count)
      return {
        bet: formatEth(hand.bet),
        status: Number(hand.status),
        count,
        cards: takeCards({ cards: hand.cards, count })
      }
    })
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
