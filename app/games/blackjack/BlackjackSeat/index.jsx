import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { clampEth, toChips } from "app/games/roulette/chips"
import { handValue, playerCardDelay, statusLabel, takeCards, STATUS } from "../cards"
import PlayingCard from "../BlackjackGame/PlayingCard"
import ChipMark from "../BlackjackGame/ChipMark"

const CARD_STEP_X = 0.55
const CARD_STEP_Y = 0.8
const CARD_W = 2.25
const CARD_H = 3.25

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
  const stake = doubled ? clampEth(amount / 2) : clampEth(amount)
  const chips = toChips(stake).slice(-4)
  return (
    <div
      className={cn(
        "blackjack-hand-wager",
        doubled && "blackjack-hand-wager-doubled",
        "relative flex items-center justify-center gap-1",
        doubled && "flex-col"
      )}
    >
      {doubled &&
        <ChipPile
          chips={chips}
          className={cn("blackjack-hand-wager-double")}
        />
      }
      <ChipPile chips={chips} />
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
  settled = false,
  dealerTotal = 0,
  dealerCount = 0,
  dealOrder = -1,
  dealSeats = 0,
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
  const liveWagers = _.filter(shownHands, (hand) => {
    const { status } = hand || {}
    if (status === STATUS.Bust) return false
    if (!settled) return true
    if (status === STATUS.Blackjack) return true
    const dealerBj = dealerCount === 2 && dealerTotal === 21
    if (dealerBj) return false
    const { total } = handValue(takeCards(hand))
    if (dealerTotal > 21) return true
    if (total > dealerTotal) return true
    return total === dealerTotal
  })
  const showWagers = liveWagers.length > 0
  const doubled = _.some(liveWagers, (hand) => (hand || {}).status === STATUS.Doubled)
  const primaryBet = clampEth((liveWagers[0] || {}).bet)
  let primaryStake = primaryBet
  if (doubled && !split) primaryStake = clampEth(primaryBet / 2)

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
          <div className={cn("blackjack-hand", "flex min-w-0 flex-col items-center gap-0.5")}>
            <div
              className={cn(
                "blackjack-spot-tray",
                "relative flex items-end overflow-visible rounded-[0.5rem] border border-cs-border bg-cs-elevated/80 p-0.5"
              )}
            >
              <div
                className={cn("blackjack-hand-cards", "relative isolate")}
                style={{
                  width: `${CARD_W}rem`,
                  height: `${CARD_H}rem`
                }}
              >
                <PlayingCard empty small />
              </div>
            </div>
            <span className={cn("blackjack-hand-total", "h-[1.15rem]")} />
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
          const dealerBj = dealerCount === 2 && dealerTotal === 21
          let won = false
          let handPrize = 0
          if (settled && !bust) {
            const stake = clampEth((hand || {}).bet)
            if (bj && !dealerBj) {
              won = true
              handPrize = clampEth(stake * 1.5)
            }
            if (!bj && !dealerBj) {
              if (dealerTotal > 21 || total > dealerTotal) {
                won = true
                handPrize = stake
              }
            }
          }
          if (won && !split) handPrize = clampEth(prize)
          const payoutChips = toChips(handPrize).slice(-4)
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
              {won && payoutChips.length > 0 &&
                <ChipPile
                  chips={payoutChips}
                  className={cn("blackjack-hand-payout")}
                />
              }
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
                        delay={playerCardDelay(dealOrder, dealSeats, cardIndex)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <span
                className={cn(
                  "blackjack-hand-total",
                  "h-[1.15rem] font-headings text-[0.75rem] font-bold tabular-nums tracking-[-0.02em]",
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
          split && showWagers && "blackjack-spot-circle-split",
          doubled && showWagers && "blackjack-spot-circle-doubled",
          "relative flex w-full max-w-[3.5rem] cursor-pointer flex-col items-center touch-none"
        )}
        onPointerDown={(event) => onSpotPointerDown(event, index)}
      >
        {showWagers && split &&
          <div className={cn("blackjack-spot-splits", "absolute bottom-[10%] left-1/2 z-[2] flex -translate-x-1/2 items-end gap-1")}>
            {_.map(liveWagers, (hand, handIndex) => (
              <HandWager
                key={`${index}-wager-${handIndex}`}
                amount={(hand || {}).bet}
                doubled={(hand || {}).status === STATUS.Doubled}
              />
            ))}
          </div>
        }
        <div
          className={cn(
            "blackjack-spot-box",
            current && "blackjack-spot-box-current animate-bj-spot",
            dropping && "blackjack-spot-box-drop",
            "relative flex size-[2.8rem] items-center justify-center",
            "rounded-full border bg-cs-elevated",
            lit && "border-cs-accent",
            !lit && "border-cs-border",
            betting && "hover:border-cs-border-hover"
          )}
        >
          {!hasChips && !showWagers &&
            <span className={cn("blackjack-spot-idle", "text-[0.7rem] tracking-[0.12em] text-cs-accent")}>
              {order}
            </span>
          }
          {hasChips && !showWagers &&
            <ChipPile
              chips={chips}
              liftedChip={betting ? liftedChip : undefined}
              betting={betting}
              onChipPointerDown={betting ? (event, value, chipIndex) => onChipPointerDown(event, index, value, chipIndex) : undefined}
            />
          }
          {showWagers && !split &&
            <HandWager amount={primaryStake} />
          }
        </div>
        <div className={cn("blackjack-spot-double-slot", "flex h-[1.85rem] w-full items-start justify-center")}>
          {showWagers && !split && doubled &&
            <HandWager amount={primaryStake} />
          }
        </div>
      </div>
    </div>
  )
}

export default BlackjackSeat
