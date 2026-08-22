import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { toChips } from "app/games/roulette/chips"
import { handValue, statusLabel, takeCards, STATUS } from "../cards"
import PlayingCard from "../BlackjackGame/PlayingCard"
import ChipMark from "../BlackjackGame/ChipMark"

const BlackjackSeat = ({
  index,
  seat,
  bet,
  current,
  currentHand,
  betting,
  busy,
  dropping,
  liftedChip,
  onSpotPointerDown,
  onChipPointerDown
}) => {
  const { hands = [], insurance } = seat || {}
  const order = String(index + 1).padStart(2, "0")
  const shownHands = _.filter(hands, (hand) => {
    const { status, count } = hand || {}
    return status !== STATUS.Empty || count > 0
  })
  const split = shownHands.length > 1
  const chips = toChips(bet).slice(-4)
  const hasChips = chips.length > 0
  const lit = current || dropping

  return (
    <div
      className={cn(
        "blackjack-spot",
        current && "blackjack-spot-current",
        dropping && "blackjack-spot-dropping",
        split && "blackjack-spot-split",
        busy && !current && "blackjack-spot-dim opacity-50",
        "flex min-w-0 flex-col items-center gap-1"
      )}
    >
      <div className={cn("blackjack-spot-hands", "flex min-h-[3.5rem] w-full items-end justify-center gap-0.5")}>
        {shownHands.length === 0 &&
          <div
            className={cn(
              "blackjack-spot-tray",
              lit && "blackjack-spot-tray-current",
              "flex items-end rounded-[0.5rem] border bg-cs-elevated/80 p-0.5",
              lit ? "border-cs-accent" : "border-cs-border"
            )}
          >
            <PlayingCard empty small />
          </div>
        }
        {_.map(shownHands, (hand, handIndex) => {
          const cards = takeCards(hand)
          const { total } = handValue(cards)
          const { status } = hand || {}
          const active = current && currentHand === handIndex
          const bust = status === STATUS.Bust
          const bj = status === STATUS.Blackjack
          const trayLit = dropping || active
          const label = statusLabel(status)
          const showStatus = bust || bj || status === STATUS.Doubled
          return (
            <div
              key={`${index}-${handIndex}`}
              className={cn(
                "blackjack-hand",
                active && "blackjack-hand-active",
                split && "blackjack-hand-split",
                "flex min-w-0 flex-col items-center gap-0.5"
              )}
            >
              <div
                className={cn(
                  "blackjack-spot-tray",
                  trayLit && "blackjack-spot-tray-current",
                  "flex items-end rounded-[0.5rem] border bg-cs-elevated/80 p-0.5",
                  trayLit ? "border-cs-accent" : "border-cs-border"
                )}
              >
                {_.map(cards, (card, cardIndex) => (
                  <div
                    key={`${card}-${cardIndex}`}
                    className={cn("blackjack-hand-card", cardIndex > 0 && "-ml-4")}
                    style={{ zIndex: cardIndex }}
                  >
                    <PlayingCard
                      card={card}
                      small
                      delay={index * 70 + handIndex * 90 + cardIndex * 80}
                    />
                  </div>
                ))}
              </div>
              <span
                className={cn(
                  "blackjack-hand-total",
                  "font-headings text-[0.75rem] font-bold tabular-nums tracking-[-0.02em]",
                  bust && "text-red-500",
                  bj && "text-cs-accent",
                  !bust && !bj && "text-cs-muted"
                )}
              >
                {cards.length > 0 && total}
                {showStatus &&
                  <span className={cn("blackjack-hand-status", "ml-0.5 font-sans text-[0.6rem] font-medium tracking-[0.04em]")}>
                    {label}
                  </span>
                }
              </span>
            </div>
          )
        })}
      </div>
      <div
        className={cn(
          "blackjack-spot-circle",
          current && "blackjack-spot-circle-current",
          dropping && "blackjack-spot-circle-drop",
          "relative flex aspect-square w-full max-w-[3.5rem] cursor-pointer items-center justify-center"
        )}
        data-spot={index}
        onPointerDown={(event) => onSpotPointerDown(event, index)}
      >
        <div
          className={cn(
            "blackjack-spot-box",
            current && "blackjack-spot-box-current animate-bj-spot",
            dropping && "blackjack-spot-box-drop",
            "relative flex size-[80%] items-center justify-center",
            "rounded-full border bg-cs-elevated",
            lit && "border-cs-accent",
            !lit && "border-cs-border",
            betting && "hover:border-cs-border-hover"
          )}
        >
          {!hasChips &&
            <span className={cn("blackjack-spot-idle", "text-[0.7rem] tracking-[0.12em] text-cs-accent")}>
              {order}
            </span>
          }
          {_.map(chips, (value, chipIndex) => (
            <div
              key={`${index}-${chipIndex}-${value}`}
              className={cn(
                "blackjack-spot-chip",
                "absolute animate-chip-drop",
                chipIndex === liftedChip && "invisible"
              )}
              style={{
                zIndex: chipIndex + 1,
                transform: `translate(${chipIndex * 0.2}rem, ${-chipIndex * 0.15}rem)`
              }}
              data-chip={value}
              onPointerDown={(event) => onChipPointerDown(event, index, value, chipIndex)}
            >
              <ChipMark
                value={value}
                className={cn("blackjack-spot-chip-mark", "size-7 text-[0.65rem]")}
              />
            </div>
          ))}
        </div>
      </div>
      {Number(insurance) > 0 &&
        <span className={cn("blackjack-spot-insurance", "text-[0.6rem] tracking-[0.1em] uppercase text-cs-accent-2")}>
          Ins
        </span>
      }
    </div>
  )
}

export default BlackjackSeat
