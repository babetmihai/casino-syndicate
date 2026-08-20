import React from "react"
import "./index.scss"
import _ from "lodash"
import { CHIP_COLORS, toChips } from "../../chips"

export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]
const CELL_W = 84
const CELL_H = 56
const ZERO_H = 64
const WIDTH = CELL_W * 3
const HEIGHT = CELL_H * 12 + ZERO_H
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const SPIN_MS = 45
const SLOW_STEPS = 22
const HOLD_MS = 700

const COLORS = {
  red: "var(--mantine-color-red-6)",
  black: "var(--mantine-color-gray-7)",
  green: "var(--mantine-color-teal-6)",
  winner: "var(--mantine-color-indigo-6)",
  text: "var(--mantine-color-white)"
}


const RouletteTable = React.memo(({ bets, winningNumber, landingNumber, spinning, onNumberClick, onReveal, onLitNumber }) => {
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
      onTick: (number, delay) => {
        setLitNumber(number)
        onLitNumber(number, delay)
      },
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
    onLitNumber(winningNumber)
  }, [spinning, winningNumber])

  return (
    <svg
      className="RouletteTable_svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Roulette table"
    >
      {_.range(37).map((number) => {
        const { x, y, w, h, color } = spotLayout(number)
        const winner = !spinning && litNumber === number
        const flash = spinning && litNumber === number
        let className = "RouletteTable_spot"
        if (flash) className = "RouletteTable_spot is-flash"
        if (winner) className = "RouletteTable_spot is-winner"
        let fill = color
        if (flash) fill = COLORS.winner
        const chips = toChips(bets[number] || 0).slice(-4)
        let fontSize = 15
        if (number === 0) fontSize = 18
        return (
          <g
            key={number}
            className={className}
            onClick={() => onNumberClick(number)}
          >
            <rect
              className="RouletteTable_spotBody"
              x={x + 2}
              y={y + 2}
              width={w - 4}
              height={h - 4}
              rx={8}
              ry={8}
              fill={fill}
            />
            <text
              className="RouletteTable_spotLabel"
              x={x + w / 2}
              y={y + h / 2 + 1}
              fill={COLORS.text}
              fontSize={fontSize}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {number}
            </text>
            {chips.map((value, index) => (
              <g
                key={`${index}-${value}`}
                className="RouletteTable_chipWrap"
                transform={`translate(${x + w / 2 + (index - 1.5) * 4}, ${y + h / 2 - index * 3})`}
              >
                <g className="RouletteTable_chip">
                  <circle r={16} fill={CHIP_COLORS[value].fill} />
                  <circle r={12.5} fill="none" stroke={CHIP_COLORS[value].stroke} strokeWidth={1.6} />
                  <text
                    className="RouletteTable_chipValue"
                    fill={CHIP_COLORS[value].text}
                    fontSize={12}
                    textAnchor="middle"
                    dy="0.35em"
                  >
                    {value}
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


const spotLayout = (number) => {
  if (number === 0) {
    return { x: 0, y: CELL_H * 12, w: CELL_W * 3, h: ZERO_H, color: COLORS.green }
  }
  const col = (number - 1) % 3
  const row = Math.floor((number - 1) / 3)
  let color = COLORS.red
  if (BLACK_NUMBERS.includes(number)) color = COLORS.black
  return {
    x: col * CELL_W,
    y: (11 - row) * CELL_H,
    w: CELL_W,
    h: CELL_H,
    color
  }
}

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
