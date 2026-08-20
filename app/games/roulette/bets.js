import _ from "lodash"

export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
export const RED_NUMBERS = _.difference(_.range(1, 37), BLACK_NUMBERS)
export const OUTSIDE = {
  RED: 37,
  BLACK: 38,
  EVEN: 39,
  ODD: 40,
  LOW: 41,
  HIGH: 42,
  DOZEN_1: 43,
  DOZEN_2: 44,
  DOZEN_3: 45,
  COL_3: 46,
  COL_2: 47,
  COL_1: 48
}

export const INSIDE = {
  H_SPLIT: 49,
  V_SPLIT: 73,
  ZERO_SPLIT: 106,
  STREET: 109,
  TRIO: 121,
  CORNER: 123,
  BASKET: 145,
  LINE: 146
}

export const BET_COUNT = 157


export const betWins = (index, number) => {
  if (number == null) return false
  if (index < 37) return index === number
  if (number === 0) {
    if (index >= INSIDE.ZERO_SPLIT && index < INSIDE.STREET) return true
    if (index === INSIDE.TRIO || index === INSIDE.TRIO + 1) return true
    if (index === INSIDE.BASKET) return true
    return false
  }
  if (index === OUTSIDE.RED) return _.includes(RED_NUMBERS, number)
  if (index === OUTSIDE.BLACK) return _.includes(BLACK_NUMBERS, number)
  if (index === OUTSIDE.EVEN) return number % 2 === 0
  if (index === OUTSIDE.ODD) return number % 2 === 1
  if (index === OUTSIDE.LOW) return number <= 18
  if (index === OUTSIDE.HIGH) return number >= 19
  if (index === OUTSIDE.DOZEN_1) return number <= 12
  if (index === OUTSIDE.DOZEN_2) return number >= 13 && number <= 24
  if (index === OUTSIDE.DOZEN_3) return number >= 25
  if (index === OUTSIDE.COL_3) return number % 3 === 0
  if (index === OUTSIDE.COL_2) return number % 3 === 2
  if (index === OUTSIDE.COL_1) return number % 3 === 1
  const row = Math.floor((number - 1) / 3)
  const col = 2 - ((number - 1) % 3)
  if (index >= INSIDE.H_SPLIT && index < INSIDE.V_SPLIT) {
    const splitRow = Math.floor((index - INSIDE.H_SPLIT) / 2)
    const splitCol = (index - INSIDE.H_SPLIT) % 2
    return row === splitRow && (col === splitCol || col === splitCol + 1)
  }
  if (index >= INSIDE.V_SPLIT && index < INSIDE.ZERO_SPLIT) {
    const splitRow = Math.floor((index - INSIDE.V_SPLIT) / 3)
    const splitCol = (index - INSIDE.V_SPLIT) % 3
    return col === splitCol && (row === splitRow || row === splitRow + 1)
  }
  if (index >= INSIDE.ZERO_SPLIT && index < INSIDE.STREET) return number === INSIDE.STREET - index
  if (index >= INSIDE.STREET && index < INSIDE.TRIO) return row === index - INSIDE.STREET
  if (index === INSIDE.TRIO) return number <= 2
  if (index === INSIDE.TRIO + 1) return number === 2 || number === 3
  if (index >= INSIDE.CORNER && index < INSIDE.BASKET) {
    const cornerRow = Math.floor((index - INSIDE.CORNER) / 2)
    const cornerCol = (index - INSIDE.CORNER) % 2
    return (row === cornerRow || row === cornerRow + 1) && (col === cornerCol || col === cornerCol + 1)
  }
  if (index === INSIDE.BASKET) return number <= 3
  if (index >= INSIDE.LINE && index < BET_COUNT) {
    const lineRow = index - INSIDE.LINE
    return row === lineRow || row === lineRow + 1
  }
  return false
}

export const maxPotentialPayout = (bets) => {
  return _.max(_.map(_.range(37), (number) => {
    let amount = 0
    _.forEach(bets, (bet, index) => {
      if (!bet) return
      if (!betWins(index, number)) return
      let payout = 6
      if (index < 37) payout = 36
      else if (index <= 42) payout = 2
      else if (index <= 48) payout = 3
      else if (index < INSIDE.STREET) payout = 18
      else if (index < INSIDE.CORNER) payout = 12
      else if (index < INSIDE.LINE) payout = 9
      amount += bet * payout
    })
    return amount
  })) || 0
}
