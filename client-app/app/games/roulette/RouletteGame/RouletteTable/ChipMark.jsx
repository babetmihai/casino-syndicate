import React from "react"
import { CHIP_COLORS, chipLabel } from "../../chips"
import { cn } from "app/core"


export const CHIP_R = 14

const ChipMark = ({ value, className }) => {
  const color = CHIP_COLORS[value]
  return (
    <g className={cn("roulette-chip-mark", "animate-chip-drop cursor-grab", className)}>
      <circle className={cn("roulette-chip-mark-fill")} r={CHIP_R} fill={color.fill} />
      <circle
        className={cn("roulette-chip-mark-ring")}
        r={CHIP_R - 3}
        fill="none"
        stroke={color.stroke}
        strokeWidth={1.5}
      />
      <text
        className={cn("roulette-chip-mark-label", "pointer-events-none font-sans font-medium")}
        fill={color.text}
        fontSize={11}
        textAnchor="middle"
        dy="0.35em"
      >
        {chipLabel(value)}
      </text>
    </g>
  )
}

export default ChipMark
