import React from "react"
import { cn } from "app/core"
import { decodeCard } from "../../cards"

const PlayingCard = ({ card, hidden, small, delay = 0, empty }) => {
  if (empty) {
    return (
      <div
        className={cn(
          "playing-card",
          "playing-card-empty",
          small && "playing-card-small",
          "relative flex shrink-0 rounded-[0.5rem] border border-dashed border-cs-border bg-transparent",
          small ? "h-[3rem] w-[2.1rem]" : "h-[4.5rem] w-[3.1rem]"
        )}
      />
    )
  }

  const decoded = decodeCard(card || 0) || {}
  const { label, mark, red, id } = decoded
  const faceDown = hidden || card === undefined || card === null

  return (
    <div
      className={cn(
        "playing-card",
        faceDown && "playing-card-back",
        small && "playing-card-small",
        red && "playing-card-red",
        id && `playing-card-${id}`,
        "relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[0.5rem] border border-cs-border",
        "font-headings font-extrabold tracking-[-0.02em] leading-none select-none animate-card-deal",
        small ? "h-[3rem] w-[2.1rem] px-1 py-0.5" : "h-[4.5rem] w-[3.1rem] px-1.5 py-1",
        faceDown && "bg-cs-elevated",
        !faceDown && "bg-cs-surface"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {faceDown &&
        <div
          className={cn(
            "playing-card-back-pattern",
            "absolute inset-[0.25rem] rounded-[0.3rem] border border-cs-accent/20"
          )}
        />
      }
      {!faceDown &&
        <>
          <span
            className={cn(
              "playing-card-rank",
              red ? "text-red-500" : "text-cs-text",
              small ? "text-[0.75rem]" : "text-[1rem]"
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "playing-card-suit",
              "self-end",
              red ? "text-red-500" : "text-cs-accent",
              small ? "text-[0.8rem]" : "text-[1.05rem]"
            )}
          >
            {mark}
          </span>
        </>
      }
    </div>
  )
}

export default PlayingCard
