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
  const p = path()
  p.moveTo(x + topLeftRadius, y)

  if (topRightRadius) {
    p.lineTo(x + width - topRightRadius, y)
    p.quadraticCurveTo(x + width, y, x + width, y + topRightRadius)
  } else {
    p.lineTo(x + width, y)
  }

  if (bottomRightRadius) {
    p.lineTo(x + width, y + height - bottomRightRadius)
    p.quadraticCurveTo(x + width, y + height, x + width - bottomRightRadius, y + height)
  } else {
    p.lineTo(x + width, y + height)
  }

  if (bottomLeftRadius) {
    p.lineTo(x + bottomLeftRadius, y + height)
    p.quadraticCurveTo(x, y + height, x, y + height - bottomLeftRadius)
  } else {
    p.lineTo(x, y + height)
  }

  if (topLeftRadius) {
    p.lineTo(x, y + topLeftRadius)
    p.quadraticCurveTo(x, y, x + topLeftRadius, y)
  } else {
    p.lineTo(x, y)
  }

  p.closePath()
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
