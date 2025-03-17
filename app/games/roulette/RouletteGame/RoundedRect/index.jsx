import React from "react"
import { path } from "d3-path"

const RoundedRect = ({
  width = 100,
  height = 100,
  x = 0,
  y = 0,
  radius = 0,
  topLeftRadius = radius,
  topRightRadius = radius,
  bottomLeftRadius = radius,
  bottomRightRadius = radius,
  fill = "blue",
  stroke = "none",
  strokeWidth = 1,
  onClick
}) => {
  // Create a d3-path object
  const p = path()

  // Starting point (top-left corner)
  p.moveTo(x + topLeftRadius, y)

  // Top edge to top-right
  if (topRightRadius) {
    p.lineTo(x + width - topRightRadius, y)
    p.quadraticCurveTo(x + width, y, x + width, y + topRightRadius) // Round top-right
  } else {
    p.lineTo(x + width, y)
  }

  // Right edge to bottom-right
  if (bottomRightRadius) {
    p.lineTo(x + width, y + height - bottomRightRadius)
    p.quadraticCurveTo(x + width, y + height, x + width - bottomRightRadius, y + height) // Round bottom-right
  } else {
    p.lineTo(x + width, y + height)
  }

  // Bottom edge to bottom-left
  if (bottomLeftRadius) {
    p.lineTo(x + bottomLeftRadius, y + height)
    p.quadraticCurveTo(x, y + height, x, y + height - bottomLeftRadius) // Round bottom-left
  } else {
    p.lineTo(x, y + height)
  }

  // Left edge back to top-left
  if (topLeftRadius) {
    p.lineTo(x, y + topLeftRadius)
    p.quadraticCurveTo(x, y, x + topLeftRadius, y) // Round top-left
  } else {
    p.lineTo(x, y)
  }

  p.closePath() // Close the shape

  // Convert the path to a string
  const d = p.toString()

  return (
    <>
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        pointerEvents="all"
        onClick={onClick}
      />
    </>
  )
}

export default RoundedRect