import React from "react"
import RoundedRect from "./RoundedRect"

const SIZE = 10

const BettingSpot = React.memo(({
  x,
  y,
  color,
  label,
  width = 1,
  height = 1,
  size = SIZE,
  onClick,
  winner,
  ...props
}) => {
  return (
    <g className="cursor-pointer select-none">
      <RoundedRect
        {...props}
        x={x * size}
        y={y * size}
        width={width * size}
        height={height * size}
        strokeWidth={winner ? 0.8 : 0.3}
        stroke={winner ? "gold" : "white"}
        fill={color}
        onClick={onClick}
      />
      <text
        pointerEvents="none"
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
