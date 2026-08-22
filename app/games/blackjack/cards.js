import _ from "lodash"

export const SEAT_COUNT = 3
export const HAND_COUNT = 4
export const MAX_CARDS = 12

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]

export const SUITS = [
  { id: "spades", mark: "♠", red: false },
  { id: "hearts", mark: "♥", red: true },
  { id: "diamonds", mark: "♦", red: true },
  { id: "clubs", mark: "♣", red: false }
]

export const STATUS = {
  Empty: 0,
  Playing: 1,
  Stand: 2,
  Bust: 3,
  Blackjack: 4,
  Doubled: 5
}

export const PHASE = {
  Betting: 0,
  Acting: 1
}

export const ACTION = {
  Hit: 0,
  Stand: 1,
  Double: 2,
  Split: 3
}

export const DEAL_STEP = 220
export const CARD_DEAL_MS = 420
export const DEALER_REVEAL_MS = 800

export const playerCardDelay = (order, seats, cardIndex) => {
  if (order < 0) return 0
  if (cardIndex >= 2) return 0
  return (cardIndex * seats + order) * DEAL_STEP
}

export const dealerCardDelay = (seats, cardIndex) => {
  if (cardIndex === 0) return seats * 2 * DEAL_STEP
  return cardIndex * DEALER_REVEAL_MS
}

export const decodeCard = (card) => {
  const rank = card % 13
  const suit = Math.floor(card / 13) % 4
  const { id, mark, red } = SUITS[suit] || {}
  return { rank, suit, id, mark, red, label: RANKS[rank] }
}

export const takeCards = (hand) => {
  const { cards = [], count = 0 } = hand || {}
  return _.take(cards, Number(count) || 0)
}

export const handValue = (cards = []) => {
  let total = 0
  let aces = 0
  _.forEach(cards, (card) => {
    const rank = card % 13
    if (rank === 0) {
      aces += 1
      total += 11
    } else if (rank >= 9) {
      total += 10
    } else {
      total += rank + 1
    }
  })
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return { total, soft: aces > 0 }
}

const TEN_OR_FACE = [9, 10, 11, 12]

export const isTenOrFace = (card) => _.includes(TEN_OR_FACE, Number(card) % 13)

export const canSplitCards = (cards = []) => {
  if (cards.length !== 2) return false
  const rankA = Number(cards[0]) % 13
  const rankB = Number(cards[1]) % 13
  if (rankA === rankB) return true
  return isTenOrFace(cards[0]) && isTenOrFace(cards[1])
}

export const statusLabel = (status) => {
  if (status === STATUS.Blackjack) return "Blackjack"
  if (status === STATUS.Bust) return "Bust"
  if (status === STATUS.Doubled) return "Double"
  if (status === STATUS.Stand) return "Pass"
  if (status === STATUS.Playing) return "Playing"
  return ""
}
