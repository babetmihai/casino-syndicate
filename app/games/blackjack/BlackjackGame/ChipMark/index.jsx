import React from "react"
import { cn } from "app/core"
import { CHIP_COLORS, chipLabel } from "app/games/roulette/chips"

const ChipMark = ({ value, className }) => {
  const color = CHIP_COLORS[value] || {}
  const { fill, stroke, text } = color

  return (
    <div
      className={cn(
        "blackjack-chip-mark",
        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-sans text-[0.7rem] font-medium select-none",
        className
      )}
      style={{
        background: fill,
        borderColor: stroke,
        color: text
      }}
    >
      {chipLabel(value)}
    </div>
  )
}

export default ChipMark
