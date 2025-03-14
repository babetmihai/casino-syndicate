import React from "react"
import { arc } from "d3-shape"
import "./index.scss"
const SIZE = 10

const BettingChip = ({
  value, // Chip value (e.g., "10", "100")
  size = SIZE, // Diameter of the chip
  x = 0, // X position offset
  y = 0, // Y position offset
  innerColor = "#FFD700", // Gold inner circle
  outerColor = "#8B0000", // Dark red outer ring
  textColor = "#000000", // White text
  borderColor = "#000000", // Black border
  onClick
}) => {
  // Define the outer circle (full chip)
  const outerArc = arc()
    .innerRadius(0)
    .outerRadius(size / 4.75)
    .startAngle(0)
    .endAngle(2 * Math.PI)

  // Define the inner circle (main chip area)
  const innerArc = arc()
    .innerRadius(0)
    .outerRadius(size / 5)
    .startAngle(0)
    .endAngle(2 * Math.PI)

  // Define a decorative ring (between inner and outer)
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
      {/* Outer ring */}
      <path d={outerArc()} fill={outerColor} stroke={borderColor} strokeWidth="2" />
      {/* Decorative middle ring */}
      <path d={ringArc()} fill={innerColor} opacity="0.8" />
      {/* Inner circle */}
      <path d={innerArc()} fill={innerColor} />
      {/* Chip value text */}
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
}

export default BettingChip