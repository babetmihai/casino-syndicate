import { ethers } from "ethers"
import _ from "lodash"
import { ACTION, HAND_COUNT, MAX_CARDS, PHASE, SEAT_COUNT, STATUS, canSplitCards, handValue } from "./cards"

export const cardAt = (secret, playerSeed, index) => {
  const packed = ethers.solidityPacked(
    ["bytes32", "bytes32", "uint256"],
    [secret, playerSeed, BigInt(index)]
  )
  return Number(BigInt(ethers.keccak256(packed)) % 52n)
}

export const playRound = ({ secret, playerSeed, bets, player, payer, kinds = [] }) => {
  const board = openBoard({ secret, playerSeed, bets, player, payer })
  _.forEach(kinds, (kind) => {
    if (board.phase !== PHASE.Acting) throw new Error("Wait")
    takeAction(board, kind)
  })
  return board
}

const openBoard = ({ secret, playerSeed, bets, player, payer }) => {
  const board = {
    secret,
    playerSeed,
    drawIndex: 0,
    extra: 0n,
    phase: PHASE.Acting,
    currentSeat: 0,
    currentHand: 0,
    dealerCount: 0,
    dealerCards: _.range(MAX_CARDS).map(() => 0),
    seats: _.map(_.range(SEAT_COUNT), () => emptySeat())
  }
  _.forEach(_.range(SEAT_COUNT), (i) => {
    const bet = bets[i] || 0n
    if (bet === 0n) return
    const seat = board.seats[i]
    seat.player = player
    seat.payer = payer
    const hand = seat.hands[0]
    hand.bet = bet
    dealTo(board, i, 0)
    dealTo(board, i, 0)
    hand.status = STATUS.Playing
    if (handTotal(hand) === 21) hand.status = STATUS.Blackjack
  })
  board.dealerCards[0] = drawCard(board)
  board.dealerCount = 1
  nextTurn(board)
  return board
}

const takeAction = (board, kind) => {
  const seatIndex = board.currentSeat
  const handIndex = board.currentHand
  const seat = board.seats[seatIndex]
  const hand = seat.hands[handIndex]
  if (hand.status !== STATUS.Playing) throw new Error("Playing")
  if (kind === ACTION.Hit) {
    dealTo(board, seatIndex, handIndex)
    const total = handTotal(hand)
    if (total > 21) hand.status = STATUS.Bust
    else if (total === 21) hand.status = STATUS.Stand
  } else if (kind === ACTION.Stand) {
    hand.status = STATUS.Stand
  } else if (kind === ACTION.Double) {
    if (hand.count !== 2) throw new Error("Double")
    board.extra += hand.bet
    hand.bet += hand.bet
    dealTo(board, seatIndex, handIndex)
    if (handTotal(hand) > 21) hand.status = STATUS.Bust
    else hand.status = STATUS.Doubled
  } else {
    if (hand.count !== 2) throw new Error("Split")
    if (!canSplitCards([hand.cards[0], hand.cards[1]])) throw new Error("Split")
    const next = emptyHandIndex(seat)
    if (next >= HAND_COUNT) throw new Error("Split")
    const nextHand = seat.hands[next]
    board.extra += hand.bet
    const splitCard = hand.cards[1]
    hand.cards[1] = 0
    hand.count = 1
    nextHand.bet = hand.bet
    nextHand.cards[0] = splitCard
    nextHand.count = 1
    nextHand.status = STATUS.Playing
    const aces = rankOf(hand.cards[0]) === 0
    dealTo(board, seatIndex, handIndex)
    dealTo(board, seatIndex, next)
    if (aces) {
      hand.status = STATUS.Stand
      nextHand.status = STATUS.Stand
    } else {
      if (handTotal(hand) === 21) hand.status = STATUS.Stand
      if (handTotal(nextHand) === 21) nextHand.status = STATUS.Stand
    }
  }
  if (hand.status !== STATUS.Playing) nextTurn(board)
}

const nextTurn = (board) => {
  for (let s = 0; s < SEAT_COUNT; s++) {
    for (let h = 0; h < HAND_COUNT; h++) {
      if (board.seats[s].hands[h].status !== STATUS.Playing) continue
      board.currentSeat = s
      board.currentHand = h
      return
    }
  }
  settleBoard(board)
}

const settleBoard = (board) => {
  while (board.dealerCount < MAX_CARDS && dealerTotal(board) < 17) {
    board.dealerCards[board.dealerCount] = drawCard(board)
    board.dealerCount += 1
  }
  board.phase = PHASE.Betting
  board.currentSeat = 0
  board.currentHand = 0
}

const dealTo = (board, seatIndex, handIndex) => {
  const hand = board.seats[seatIndex].hands[handIndex]
  if (hand.count >= MAX_CARDS) throw new Error("Cards")
  hand.cards[hand.count] = drawCard(board)
  hand.count += 1
}

const drawCard = (board) => {
  const card = cardAt(board.secret, board.playerSeed, board.drawIndex)
  board.drawIndex += 1
  return card
}

const handTotal = (hand) => {
  const { total } = handValue(_.take(hand.cards, hand.count))
  return total
}

const dealerTotal = (board) => {
  const { total } = handValue(_.take(board.dealerCards, board.dealerCount))
  return total
}

const emptyHandIndex = (seat) => {
  const index = _.findIndex(seat.hands, (hand) => hand.status === STATUS.Empty)
  if (index < 0) return HAND_COUNT
  return index
}

const emptySeat = () => ({
  player: ethers.ZeroAddress,
  payer: ethers.ZeroAddress,
  hands: _.map(_.range(HAND_COUNT), emptyHand)
})

const emptyHand = () => ({
  bet: 0n,
  status: STATUS.Empty,
  count: 0,
  cards: _.map(_.range(MAX_CARDS), () => 0)
})

const rankOf = (card) => Number(card) % 13
