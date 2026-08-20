import React from "react"
import "./index.scss"
import _ from "lodash"
import { CHIP_COLORS, chipLabel, toChips } from "../../chips"
import { BLACK_NUMBERS, INSIDE, OUTSIDE, betWins } from "../../bets"

const CELL_W = 84
const CELL_H = 56
const ZERO_H = CELL_H
const DOZEN_W = 76
const EVEN_W = 76
const COL_H = 56
const HIT = 36
const WIDTH = CELL_W * 3 + DOZEN_W + EVEN_W
const HEIGHT = ZERO_H + CELL_H * 12 + COL_H
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const SPIN_MS = 45
const SLOW_STEPS = 22
const HOLD_MS = 700

const COLORS = {
  red: "var(--mantine-color-red-6)",
  black: "var(--mantine-color-gray-7)",
  green: "var(--mantine-color-teal-6)",
  outside: "var(--mantine-color-white)",
  outsideText: "var(--mantine-color-dark-6)",
  winner: "var(--mantine-color-indigo-6)",
  text: "var(--mantine-color-white)"
}

const numberLayout = (number) => {
  if (number === 0) {
    return { x: 0, y: 0, w: CELL_W * 3, h: ZERO_H, color: COLORS.green }
  }
  const col = 2 - ((number - 1) % 3)
  const row = Math.floor((number - 1) / 3)
  let color = COLORS.red
  if (_.includes(BLACK_NUMBERS, number)) color = COLORS.black
  return {
    x: col * CELL_W,
    y: ZERO_H + row * CELL_H,
    w: CELL_W,
    h: CELL_H,
    color
  }
}

const outsideSpot = { color: COLORS.outside, labelFill: COLORS.outsideText, fontSize: 14 }

const insideSpot = (index, cx, cy, w = HIT, h = HIT) => ({
  index,
  x: cx - w / 2,
  y: cy - h / 2,
  w,
  h,
  rx: Math.min(w, h) / 2,
  color: "transparent",
  inside: true
})

const SPOTS = [
  ..._.range(37).map((number) => {
    const layout = numberLayout(number)
    let fontSize = 16
    if (number === 0) fontSize = 22
    return { index: number, ...layout, label: String(number), fontSize }
  }),
  { index: OUTSIDE.DOZEN_1, x: CELL_W * 3, y: ZERO_H, w: DOZEN_W, h: CELL_H * 4, label: "1-12", ...outsideSpot },
  { index: OUTSIDE.DOZEN_2, x: CELL_W * 3, y: ZERO_H + CELL_H * 4, w: DOZEN_W, h: CELL_H * 4, label: "13-24", ...outsideSpot },
  { index: OUTSIDE.DOZEN_3, x: CELL_W * 3, y: ZERO_H + CELL_H * 8, w: DOZEN_W, h: CELL_H * 4, label: "25-36", ...outsideSpot },
  { index: OUTSIDE.LOW, x: CELL_W * 3 + DOZEN_W, y: ZERO_H, w: EVEN_W, h: CELL_H * 2, label: "1-18", ...outsideSpot },
  { index: OUTSIDE.EVEN, x: CELL_W * 3 + DOZEN_W, y: ZERO_H + CELL_H * 2, w: EVEN_W, h: CELL_H * 2, label: "Even", ...outsideSpot },
  {
    index: OUTSIDE.RED,
    x: CELL_W * 3 + DOZEN_W,
    y: ZERO_H + CELL_H * 4,
    w: EVEN_W,
    h: CELL_H * 2,
    label: "Red",
    color: COLORS.red,
    fontSize: 14
  },
  {
    index: OUTSIDE.BLACK,
    x: CELL_W * 3 + DOZEN_W,
    y: ZERO_H + CELL_H * 6,
    w: EVEN_W,
    h: CELL_H * 2,
    label: "Black",
    color: COLORS.black,
    fontSize: 14
  },
  { index: OUTSIDE.ODD, x: CELL_W * 3 + DOZEN_W, y: ZERO_H + CELL_H * 8, w: EVEN_W, h: CELL_H * 2, label: "Odd", ...outsideSpot },
  { index: OUTSIDE.HIGH, x: CELL_W * 3 + DOZEN_W, y: ZERO_H + CELL_H * 10, w: EVEN_W, h: CELL_H * 2, label: "19-36", ...outsideSpot },
  { index: OUTSIDE.COL_3, x: 0, y: ZERO_H + CELL_H * 12, w: CELL_W, h: COL_H, label: "2:1", ...outsideSpot, fontSize: 15 },
  { index: OUTSIDE.COL_2, x: CELL_W, y: ZERO_H + CELL_H * 12, w: CELL_W, h: COL_H, label: "2:1", ...outsideSpot, fontSize: 15 },
  { index: OUTSIDE.COL_1, x: CELL_W * 2, y: ZERO_H + CELL_H * 12, w: CELL_W, h: COL_H, label: "2:1", ...outsideSpot, fontSize: 15 },
  ..._.flatMap(_.range(12), (row) => _.map(_.range(2), (splitCol) => {
    return insideSpot(
      INSIDE.H_SPLIT + row * 2 + splitCol,
      (splitCol + 1) * CELL_W,
      ZERO_H + row * CELL_H + CELL_H / 2,
      HIT,
      CELL_H * 0.5
    )
  })),
  ..._.flatMap(_.range(11), (row) => _.map(_.range(3), (col) => {
    return insideSpot(
      INSIDE.V_SPLIT + row * 3 + col,
      col * CELL_W + CELL_W / 2,
      ZERO_H + (row + 1) * CELL_H,
      CELL_W * 0.5,
      HIT
    )
  })),
  ..._.map([3, 2, 1], (number, i) => {
    const col = 2 - ((number - 1) % 3)
    return insideSpot(
      INSIDE.ZERO_SPLIT + i,
      col * CELL_W + CELL_W / 2,
      ZERO_H,
      CELL_W * 0.5,
      HIT
    )
  }),
  ..._.map(_.range(12), (row) => insideSpot(
    INSIDE.STREET + row,
    CELL_W * 3,
    ZERO_H + row * CELL_H + CELL_H / 2
  )),
  insideSpot(INSIDE.TRIO, CELL_W * 2, ZERO_H),
  insideSpot(INSIDE.TRIO + 1, CELL_W, ZERO_H),
  ..._.flatMap(_.range(11), (row) => _.map(_.range(2), (col) => {
    return insideSpot(
      INSIDE.CORNER + row * 2 + col,
      (col + 1) * CELL_W,
      ZERO_H + (row + 1) * CELL_H
    )
  })),
  insideSpot(INSIDE.BASKET, 0, ZERO_H),
  ..._.map(_.range(11), (row) => insideSpot(
    INSIDE.LINE + row,
    CELL_W * 3,
    ZERO_H + (row + 1) * CELL_H
  ))
]


const RouletteTable = React.memo(({ bets, winningNumber, landingNumber, spinning, onSpotClick, onReveal }) => {
  const landingRef = React.useRef(landingNumber)
  const onRevealRef = React.useRef(onReveal)
  const litRef = React.useRef(winningNumber)
  const [litNumber, setLitNumber] = React.useState(winningNumber)
  landingRef.current = landingNumber
  onRevealRef.current = onReveal
  litRef.current = litNumber

  React.useEffect(() => {
    if (!spinning) return
    let holdTimer
    const stopFlash = runNumberFlash({
      from: litRef.current,
      getWinner: () => landingRef.current,
      onTick: setLitNumber,
      onDone: (winner) => {
        setLitNumber(winner)
        holdTimer = _.delay(() => {
          if (onRevealRef.current) onRevealRef.current()
        }, HOLD_MS)
      }
    })
    return () => {
      stopFlash()
      clearTimeout(holdTimer)
    }
  }, [spinning])

  React.useEffect(() => {
    if (spinning) return
    if (winningNumber == null) return
    setLitNumber(winningNumber)
  }, [spinning, winningNumber])

  return (
    <svg
      className="RouletteTable_svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Roulette table"
    >
      {SPOTS.map((spot) => {
        const { index, x, y, w, h, color, label, fontSize, labelFill = COLORS.text, rx = 8, inside } = spot
        let winner = false
        if (!spinning && !inside) winner = betWins(index, litNumber)
        const flash = spinning && index < 37 && litNumber === index
        let className = "RouletteTable_spot"
        if (inside) className = "RouletteTable_spot is-inside"
        else if (index >= 37) className = "RouletteTable_spot is-outside"
        if (flash) className = `${className} is-flash`
        if (winner) className = `${className} is-winner`
        if (bets[index] > 0) className = `${className} is-bet`
        let fill = color
        if (flash) fill = COLORS.winner
        let inset = 2
        if (inside) inset = 0
        const chips = toChips(bets[index] || 0).slice(-4)
        return (
          <g
            key={index}
            className={className}
            onClick={() => onSpotClick(index)}
          >
            <rect
              className="RouletteTable_spotBody"
              x={x + inset}
              y={y + inset}
              width={w - inset * 2}
              height={h - inset * 2}
              rx={rx}
              ry={rx}
              fill={fill}
            />
            {label &&
              <text
                className="RouletteTable_spotLabel"
                x={x + w / 2}
                y={y + h / 2 + 1}
                fill={labelFill}
                fontSize={fontSize}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            }
            {chips.map((value, chipIndex) => (
              <g
                key={`${chipIndex}-${value}`}
                className="RouletteTable_chipWrap"
                transform={`translate(${x + w / 2 + (chipIndex - 1.5) * 4}, ${y + h / 2 - chipIndex * 3})`}
              >
                <g className="RouletteTable_chip">
                  <circle r={14} fill={CHIP_COLORS[value].fill} />
                  <circle r={11} fill="none" stroke={CHIP_COLORS[value].stroke} strokeWidth={1.5} />
                  <text
                    className="RouletteTable_chipValue"
                    fill={CHIP_COLORS[value].text}
                    fontSize={11}
                    textAnchor="middle"
                    dy="0.35em"
                  >
                    {chipLabel(value)}
                  </text>
                </g>
              </g>
            ))}
          </g>
        )
      })}
    </svg>
  )
})

export default RouletteTable


const runNumberFlash = ({ from, getWinner, onTick, onDone }) => {
  let timer
  let stopped = false
  let steps = 0
  let startIndex = _.indexOf(WHEEL, from)
  if (startIndex < 0) startIndex = 0
  let index = startIndex

  onTick(WHEEL[index], SPIN_MS)

  const tick = () => {
    if (stopped) return
    index = (index + 1) % WHEEL.length
    steps += 1

    const winner = getWinner()
    let delay = SPIN_MS
    if (winner != null) {
      const winnerIndex = _.indexOf(WHEEL, winner)
      const distance = (winnerIndex - startIndex + WHEEL.length) % WHEEL.length
      const minSteps = WHEEL.length * 3 + distance
      if (steps >= minSteps && index === winnerIndex) {
        onTick(WHEEL[index], delay)
        onDone(winner)
        return
      }
      let remaining = minSteps - steps
      if (steps >= minSteps) remaining = (winnerIndex - index + WHEEL.length) % WHEEL.length
      if (remaining <= SLOW_STEPS) {
        const t = 1 - remaining / SLOW_STEPS
        delay = SPIN_MS + t * t * t * 560
      }
    }

    onTick(WHEEL[index], delay)
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, SPIN_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
