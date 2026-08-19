import React from "react"
import { arc } from "d3-shape"
import "./index.scss"

const SIZE = 10

const BettingChip = React.memo(({
  value,
  size = SIZE,
  x = 0,
  y = 0,
  innerColor = "#FFD700",
  outerColor = "#8B0000",
  textColor = "#000000",
  borderColor = "#000000",
  onClick
}) => {
  const outerArc = arc()
    .innerRadius(0)
    .outerRadius(size / 4.75)
    .startAngle(0)
    .endAngle(2 * Math.PI)

  const innerArc = arc()
    .innerRadius(0)
    .outerRadius(size / 5)
    .startAngle(0)
    .endAngle(2 * Math.PI)

  const ringArc = arc()
    .innerRadius(size / 6)
    .outerRadius(size / 4.55)
    .startAngle(0)
    .endAngle(2 * Math.PI)

  return (
    <g
      transform={`translate(${size / 2 + x * SIZE}, ${size / 2 + y * SIZE})`}
      className="BettingChip_root"
    >
      <path
        d={outerArc()}
        fill={outerColor}
        stroke={borderColor}
        strokeWidth="2"
      />
      <path d={ringArc()} fill={innerColor} opacity="0.8" />
      <path d={innerArc()} fill={innerColor} />
      <text
        textAnchor="middle"
        dy=".35em"
        fill={textColor}
        fontSize={size / 3}
        fontFamily="Arial, sans-serif"
        className="BettingChip_text"
        fontWeight="bold"
        onClick={onClick}
      >
        {value}
      </text>
    </g>
  )
})

export default BettingChip
