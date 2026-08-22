import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { clampEth, toChips } from "app/games/roulette/chips"
import { handValue, statusLabel, takeCards, STATUS } from "../cards"
import PlayingCard from "../BlackjackGame/PlayingCard"
import ChipMark from "../BlackjackGame/ChipMark"

const CARD_STEP_X = 0.55
const CARD_STEP_Y = 0.8
const CARD_W = 2.25
const CARD_H = 3.25
const CHIP_BEHIND = -0.7

const ChipPile = ({
  chips,
  className,
  zBase = 1,
  shiftY = 0,
  liftedChip,
  betting,
  onChipPointerDown
}) => {
  const pile = chips || []
  if (pile.length === 0) return null
  return (
    <div className={cn("blackjack-chip-pile", "relative size-7", className)}>
      {_.map(pile, (value, chipIndex) => (
        <div
          key={`${value}-${chipIndex}`}
          className={cn(
            "blackjack-chip-pile-chip",
            "absolute inset-0 animate-chip-drop touch-none",
            betting && "cursor-grab",
            chipIndex === liftedChip && "invisible"
          )}
          style={{
            zIndex: zBase + chipIndex,
            transform: `translate(${chipIndex * 0.2}rem, ${shiftY - chipIndex * 0.15}rem)`
          }}
          data-chip={value}
          onPointerDown={onChipPointerDown ? (event) => onChipPointerDown(event, value, chipIndex) : undefined}
        >
          <ChipMark
            value={value}
            className={cn("blackjack-spot-chip-mark", "size-7 text-[0.65rem]")}
          />
        </div>
      ))}
    </div>
  )
}

const HandWager = ({ amount, doubled }) => {
  const front = doubled ? clampEth(amount / 2) : clampEth(amount)
  const frontChips = toChips(front).slice(-4)
  const backChips = doubled ? frontChips : []
  return (
    <div className={cn("blackjack-hand-wager", "relative flex size-7 items-end justify-center")}>
      {backChips.length > 0 &&
        <ChipPile
          chips={backChips}
          className={cn("blackjack-hand-wager-back", "absolute inset-0")}
          zBase={1}
          shiftY={CHIP_BEHIND}
        />
      }
      <ChipPile
        chips={frontChips}
        className={cn("blackjack-hand-wager-front")}
        zBase={8}
      />
    </div>
  )
}

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
  prize = 0,
  result = "",
  onSpotPointerDown,
  onChipPointerDown
}) => {
  const { hands = [] } = seat || {}
  const order = String(index + 1).padStart(2, "0")
  const shownHands = _.filter(hands, (hand) => {
    const { status, count } = hand || {}
    return status !== STATUS.Empty || count > 0
  })
  const split = shownHands.length > 1
  const chips = toChips(bet).slice(-4)
  const hasChips = chips.length > 0
  const lit = current || dropping
  const showRoundWagers = shownHands.length > 0
  const prizeChips = toChips(prize).slice(-4)
  const hasPrize = prizeChips.length > 0

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
      data-spot={index}
    >
      <div className={cn("blackjack-spot-hands", "flex min-h-[3.5rem] w-full items-end justify-center gap-0.5")}>
        {shownHands.length === 0 &&
          <div
            className={cn(
              "blackjack-spot-tray",
              "flex items-end overflow-visible rounded-[0.5rem] border border-cs-border bg-cs-elevated/80 p-0.5"
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
          const label = statusLabel(status)
          const showStatus = bust || bj || status === STATUS.Doubled || result
          const resultWin = result === "Win"
          const resultLose = result === "Lose"
          return (
            <div
              key={`${index}-${handIndex}`}
              className={cn(
                "blackjack-hand",
                active && "blackjack-hand-active",
                split && "blackjack-hand-split",
                "flex min-w-0 flex-col items-center gap-0.5",
                split && !active && "opacity-50"
              )}
            >
              <div
                className={cn(
                  "blackjack-spot-tray",
                  active && "blackjack-spot-tray-current",
                  "relative flex items-end overflow-visible rounded-[0.5rem] border bg-cs-elevated/80 p-0.5",
                  active && "border-cs-accent",
                  !active && "border-cs-border"
                )}
              >
                <div
                  className={cn("blackjack-hand-cards", "relative isolate")}
                  style={{
                    width: `${CARD_W}rem`,
                    height: `${CARD_H}rem`
                  }}
                >
                  {_.map(cards, (card, cardIndex) => (
                    <div
                      key={`${card}-${cardIndex}`}
                      className={cn("blackjack-hand-card", "absolute")}
                      style={{
                        zIndex: cardIndex + 1,
                        left: `${cardIndex * CARD_STEP_X}rem`,
                        bottom: `${cardIndex * CARD_STEP_Y}rem`
                      }}
                    >
                      <PlayingCard
                        card={card}
                        small
                        delay={index * 70 + handIndex * 90 + cardIndex * 80}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <span
                className={cn(
                  "blackjack-hand-total",
                  "font-headings text-[0.75rem] font-bold tabular-nums tracking-[-0.02em]",
                  (bust || resultLose) && "text-red-500",
                  (bj || resultWin) && "text-cs-accent",
                  !bust && !bj && !resultWin && !resultLose && "text-cs-muted"
                )}
              >
                {cards.length > 0 && total}
                {showStatus &&
                  <span className={cn("blackjack-hand-status", "ml-0.5 font-sans text-[0.6rem] font-medium tracking-[0.04em]")}>
                    {result || label}
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
          split && showRoundWagers && "blackjack-spot-circle-split",
          "relative flex items-end justify-center gap-1 touch-none",
          ((showRoundWagers && split) || hasPrize) && "w-full",
          !showRoundWagers && !hasPrize && "aspect-square w-full max-w-[3.5rem] cursor-pointer",
          showRoundWagers && !split && !hasPrize && "aspect-square w-full max-w-[3.5rem] cursor-pointer"
        )}
        onPointerDown={(event) => onSpotPointerDown(event, index)}
      >
        {(!showRoundWagers || !split) &&
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
            {!hasChips && !showRoundWagers &&
              <span className={cn("blackjack-spot-idle", "text-[0.7rem] tracking-[0.12em] text-cs-accent")}>
                {order}
              </span>
            }
            {!showRoundWagers &&
              <ChipPile
                chips={chips}
                liftedChip={liftedChip}
                betting={betting}
                onChipPointerDown={(event, value, chipIndex) => onChipPointerDown(event, index, value, chipIndex)}
              />
            }
            {showRoundWagers && !split &&
              <HandWager
                amount={(shownHands[0] || {}).bet}
                doubled={(shownHands[0] || {}).status === STATUS.Doubled}
              />
            }
          </div>
        }
        {showRoundWagers && split &&
          _.map(shownHands, (hand, handIndex) => (
            <HandWager
              key={`${index}-wager-${handIndex}`}
              amount={(hand || {}).bet}
              doubled={(hand || {}).status === STATUS.Doubled}
            />
          ))
        }
        {hasPrize &&
          <ChipPile
            chips={prizeChips}
            className={cn("blackjack-spot-payout")}
          />
        }
      </div>
    </div>
  )
}

export default BlackjackSeat
