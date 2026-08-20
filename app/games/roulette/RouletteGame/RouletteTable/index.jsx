import React from "react"
import "./index.scss"
import _ from "lodash"
import { CHIP_COLORS, toChips } from "../../chips"

const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]
const CELL_W = 84
const CELL_H = 56
const ZERO_H = 64
const WIDTH = CELL_W * 3
const HEIGHT = ZERO_H + CELL_H * 12
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
const SPIN_MS = 45
const SLOW_STEPS = 12
const HOLD_MS = 800

const COLORS = {
  red: "var(--mantine-color-red-6)",
  black: "var(--mantine-color-gray-7)",
  green: "var(--mantine-color-teal-6)",
  winner: "var(--mantine-color-indigo-6)",
  text: "var(--mantine-color-white)"
}


const RouletteTable = React.memo(({ bets, winningNumber, landingNumber, spinning, onNumberClick, onReveal }) => {
  const landingRef = React.useRef(landingNumber)
  const onRevealRef = React.useRef(onReveal)
  const litRef = React.useRef(winningNumber)
  const [litNumber, setLitNumber] = React.useState(winningNumber)
  const [sparks, setSparks] = React.useState([])
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
        const { x, y, w, h } = spotLayout(winner)
        setSparks(_.range(6).map((i) => ({
          key: `${winner}-${i}`,
          x: x + w / 2,
          y: y + h / 2,
          dx: Math.cos((i / 6) * Math.PI * 2) * 16,
          dy: Math.sin((i / 6) * Math.PI * 2) * 12
        })))
        _.delay(() => setSparks([]), 360)
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
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label="Roulette table"
    >
      <defs>
        <filter id="spotLift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="var(--mantine-color-gray-9)" floodOpacity="0.08" />
        </filter>
        <filter id="winnerLift" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="var(--mantine-color-indigo-6)" floodOpacity="0.22" />
        </filter>
        <filter id="chipShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="var(--mantine-color-gray-9)" floodOpacity="0.12" />
        </filter>
      </defs>
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
                <g className="RouletteTable_chip" filter="url(#chipShadow)">
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
      {sparks.map((spark) => (
        <g
          key={spark.key}
          transform={`translate(${spark.x}, ${spark.y})`}
        >
          <g
            className="RouletteTable_spark"
            style={{ "--dx": `${spark.dx}px`, "--dy": `${spark.dy}px` }}
          >
            <circle r={1.8} fill={COLORS.winner} />
          </g>
        </g>
      ))}
    </svg>
  )
})

export default RouletteTable


const spotLayout = (number) => {
  if (number === 0) {
    return { x: 0, y: 0, w: CELL_W * 3, h: ZERO_H, color: COLORS.green }
  }
  const col = 2 - ((number - 1) % 3)
  const row = Math.floor((number - 1) / 3)
  let color = COLORS.red
  if (BLACK_NUMBERS.includes(number)) color = COLORS.black
  return {
    x: col * CELL_W,
    y: ZERO_H + row * CELL_H,
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

  onTick(WHEEL[index])

  const tick = () => {
    if (stopped) return
    index = (index + 1) % WHEEL.length
    steps += 1
    onTick(WHEEL[index])

    const winner = getWinner()
    if (winner == null) {
      timer = _.delay(tick, SPIN_MS)
      return
    }

    const winnerIndex = _.indexOf(WHEEL, winner)
    const distance = (winnerIndex - startIndex + WHEEL.length) % WHEEL.length
    const minSteps = WHEEL.length * 3 + distance
    if (steps >= minSteps && index === winnerIndex) {
      onDone(winner)
      return
    }

    let remaining = minSteps - steps
    if (steps >= minSteps) remaining = (winnerIndex - index + WHEEL.length) % WHEEL.length
    let delay = SPIN_MS
    if (remaining <= SLOW_STEPS) {
      const t = 1 - remaining / SLOW_STEPS
      delay = SPIN_MS + t * t * 280
    }
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, SPIN_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
