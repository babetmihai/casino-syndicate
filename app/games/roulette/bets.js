import _ from "lodash"

export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
export const RED_NUMBERS = _.difference(_.range(1, 37), BLACK_NUMBERS)
export const BET_COUNT = 49
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


export const betWins = (index, number) => {
  if (number == null) return false
  if (index < 37) return index === number
  if (number === 0) return false
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
  return false
}
