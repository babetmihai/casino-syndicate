import React from "react"
import "./index.scss"
import _ from "lodash"
import { arc, pie } from "d3-shape"
import { BLACK_NUMBERS, WHEEL } from "../RouletteTable"


const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER = 114
const INNER = 98
const LABEL_R = 106
const POCKET = 360 / WHEEL.length
const COLORS = {
  red: "var(--mantine-color-red-6)",
  black: "var(--mantine-color-gray-7)",
  green: "var(--mantine-color-teal-6)",
  winner: "var(--mantine-color-indigo-6)",
  text: "var(--mantine-color-white)"
}

const slices = pie()
  .value(() => 1)
  .sort(null)
  .startAngle(0)
  .endAngle(Math.PI * 2)(WHEEL)

const sliceArc = arc().innerRadius(INNER).outerRadius(OUTER)
const labelArc = arc().innerRadius(LABEL_R).outerRadius(LABEL_R)


const RouletteWheel = React.memo(({ number, delay, spinning }) => {
  const lastRotation = React.useRef(0)
  const [rotation, setRotation] = React.useState(0)
  let duration = 45
  if (delay) duration = delay

  React.useEffect(() => {
    if (number == null) return
    const index = _.indexOf(WHEEL, number)
    let next = -(index + 0.5) * POCKET
    while (next > lastRotation.current) next -= 360
    lastRotation.current = next
    setRotation(next)
  }, [number])

  return (
    <svg
      className="RouletteWheel_svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Roulette wheel"
    >
      <g transform={`translate(${CX}, ${CY})`}>
        <g
          className="RouletteWheel_rotor"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${duration}ms cubic-bezier(0.12, 0.68, 0.18, 1)`
          }}
        >
          <circle
            r={INNER - 2}
            fill="var(--mantine-color-gray-1)"
          />
          {slices.map((item) => {
            const pocket = item.data
            const lit = pocket === number
            const flash = spinning && lit
            const winner = !spinning && lit
            let fill = COLORS.red
            if (pocket === 0) fill = COLORS.green
            if (_.includes(BLACK_NUMBERS, pocket)) fill = COLORS.black
            if (flash) fill = COLORS.winner
            let className = "RouletteWheel_pocket"
            if (flash) className = "RouletteWheel_pocket is-flash"
            if (winner) className = "RouletteWheel_pocket is-winner"
            const [lx, ly] = labelArc.centroid(item)
            const deg = ((item.startAngle + item.endAngle) / 2) * (180 / Math.PI)
            return (
              <g
                key={pocket}
                className={className}
              >
                <path
                  className="RouletteWheel_pocketBody"
                  d={sliceArc(item)}
                  fill={fill}
                />
                <text
                  className="RouletteWheel_label"
                  fill={COLORS.text}
                  fontSize={8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`translate(${lx}, ${ly}) rotate(${deg}) scale(0.55, 1)`}
                >
                  {pocket}
                </text>
              </g>
            )
          })}
        </g>
      </g>
    </svg>
  )
})

export default RouletteWheel
