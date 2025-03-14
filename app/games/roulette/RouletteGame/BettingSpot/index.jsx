import React from "react"
import "./index.scss"
import _ from "lodash"


const SIZE = 10

const BettingSpot = React.memo(({
  x,
  y,
  color,
  label,
  width = 1,
  height = 1,
  size = SIZE
}) => {
  return (
    <g className="BettingSpot_root">
      <rect
        x={x * size}
        y={y * size}
        width={width * size}
        height={height * size}
        strokeWidth={0.3}
        stroke="white"
        fill={color}
      />
      <text
        x={(x + (width / 2)) * size}
        y={(y + (height / 2)) * size}
        textAnchor="middle"
        fill="white"
        dominantBaseline="middle"
        fontSize={size / 2.5}
      >
        {label}
      </text>
    </g>
  )
})

export default BettingSpot
