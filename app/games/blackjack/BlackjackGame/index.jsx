import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { ethers } from "ethers"
import { Button, Card, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import {
  dealBlackjack,
  doubleBlackjack,
  fetchBlackjack,
  hitBlackjack,
  selectBlackjack,
  splitBlackjack,
  standBlackjack
} from ".."
import { fetchBalance, selectAuth, setPendingBet } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn, labelClass, titleClass } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import SessionModal from "app/core/auth/SessionModal"
import {
  CHIP_VALUES,
  addEth,
  bankrollClass,
  chipLabel,
  clampEth,
  ethLabel,
  MIN_BET,
  tableMaxBet
} from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { canSplitCards, handValue, takeCards, HAND_COUNT, PHASE, SEAT_COUNT, STATUS } from "../cards"
import BlackjackSeat from "../BlackjackSeat"
import PlayingCard from "./PlayingCard"
import ChipMark from "./ChipMark"

const DRAG_THRESHOLD = 8
const emptyBets = () => _.range(SEAT_COUNT).fill(0)


const BlackjackGame = React.memo(({ address }) => {
  const [chip, setChip] = React.useState(CHIP_VALUES[0])
  const [bets, setBets] = React.useState(emptyBets)
  const [busy, setBusy] = React.useState(false)
  const [drag, setDrag] = React.useState(null)
  const dragRef = React.useRef(null)
  const tableRef = React.useRef(null)
  const { account, session, balance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const table = useSelector(() => selectBlackjack(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    lastRound, minBet, maxBet, totalBalance, phase, currentSeat, currentHand,
    dealerCards = [], seats = []
  } = table
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  const bankroll = clampEth(totalBalance)
  const playBalance = clampEth(balance)
  const betting = phase !== PHASE.Acting
  const roundDealerCards = dealerCards.length > 0 ? dealerCards : ((lastRound || {}).dealerCards || [])
  const roundDealerCount = roundDealerCards.length
  const settled = betting && roundDealerCount > 0
  const totalBet = clampEth(_.sum(bets))
  const canCover = totalBet * 8 <= bankroll + totalBet
  const myTurn = !betting && currentPlaying(seats, currentSeat, account)
  const liveSeat = seats[currentSeat] || {}
  const liveHands = liveSeat.hands || []
  const liveHand = liveHands[currentHand] || {}
  const liveCards = takeCards(liveHand)
  const livePlaying = myTurn && liveHand.status === STATUS.Playing
  const twoCards = livePlaying && liveCards.length === 2 && clampEth(liveHand.bet) > 0
  const canAffordSide = playBalance >= clampEth(liveHand.bet)
  const canDouble = twoCards && canAffordSide
  const openHand = _.some(_.take(liveHands, HAND_COUNT), (hand) => (hand || {}).status === STATUS.Empty)
  const canSplit = twoCards && openHand && canSplitCards(liveCards) && canAffordSide
  const showDouble = twoCards
  const showSplit = twoCards && openHand && canSplitCards(liveCards)
  const canDeal = authorized && betting && totalBet > 0 && totalBet <= playBalance && canCover && !busy
  const { total: dealerTotal } = handValue(roundDealerCards)
  const dealerBust = dealerTotal > 21
  const dealerBj = roundDealerCount === 2 && dealerTotal === 21
  const { paidSeats = [] } = lastRound || {}
  let dealLabel = "Deal"
  if (busy) dealLabel = "Dealing"
  const shownBets = betting ? bets : onchainBets(seats)
  let dragging = false
  if (drag && drag.moved && drag.value) dragging = true
  let hoverSpot
  if (dragging) hoverSpot = drag.hoverSpot
  const removing = dragging && hoverSpot === undefined

  React.useEffect(() => {
    fetchBlackjack(address)
  }, [address, account])

  React.useEffect(() => {
    if (!account) return
    fetchBalance()
  }, [account])

  React.useEffect(() => {
    if (!betting || busy) return
    setPendingBet(totalBet)
  }, [totalBet, betting, busy])

  React.useEffect(() => {
    return () => setPendingBet(0)
  }, [])

  const commitBets = (nextBets) => {
    const nextTotal = clampEth(_.sum(nextBets))
    if (nextTotal > playBalance) return
    if (nextTotal * 8 > bankroll + nextTotal) return
    setBets(nextBets)
  }

  const changeBet = (index, amount) => {
    if (!betting || !authorized || busy) return
    const nextBets = [...bets]
    let nextValue = addEth(nextBets[index], amount)
    if (amount > 0 && nextValue > 0 && nextValue < minBetAmount) nextValue = minBetAmount
    if (nextValue > maxBetAmount) nextValue = maxBetAmount
    nextBets[index] = nextValue
    commitBets(nextBets)
  }

  const moveChip = (fromIndex, toIndex, value) => {
    if (!betting || !authorized || busy) return
    if (fromIndex === toIndex) return
    const nextBets = [...bets]
    const fromValue = addEth(nextBets[fromIndex], -value)
    const toValue = addEth(nextBets[toIndex], value)
    if (toValue > maxBetAmount) return
    nextBets[fromIndex] = fromValue
    nextBets[toIndex] = toValue
    commitBets(nextBets)
  }

  const updateDrag = (next) => {
    dragRef.current = next
    setDrag(next)
  }

  const captureTable = (event) => {
    const table = tableRef.current
    if (!table) return
    table.setPointerCapture(event.pointerId)
  }

  const releaseTable = (event) => {
    const table = tableRef.current
    if (!table) return
    if (!table.hasPointerCapture(event.pointerId)) return
    table.releasePointerCapture(event.pointerId)
  }

  const onSpotPointerDown = (event, index) => {
    if (!betting || !authorized || busy) return
    if (event.button > 0) return
    event.preventDefault()
    captureTable(event)
    updateDrag({
      pointerId: event.pointerId,
      fromIndex: index,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    })
  }

  const onChipPointerDown = (event, index, value, chipIndex) => {
    if (!betting || !authorized || busy) return
    if (event.button > 0) return
    event.preventDefault()
    event.stopPropagation()
    captureTable(event)
    updateDrag({
      pointerId: event.pointerId,
      fromIndex: index,
      value,
      chipIndex,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    })
  }

  const onPointerMove = (event) => {
    const current = dragRef.current
    if (!current) return
    if (current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    const moved = current.moved || dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD
    if (!moved) return
    if (!current.value) {
      if (!current.moved) updateDrag({ ...current, moved: true })
      return
    }
    updateDrag({ ...current, x: event.clientX, y: event.clientY, moved: true, hoverSpot: spotAt(event.clientX, event.clientY) })
  }

  const onPointerUp = (event) => {
    const current = dragRef.current
    if (!current) return
    if (current.pointerId !== event.pointerId) return
    releaseTable(event)
    updateDrag(null)
    if (!current.moved) {
      changeBet(current.fromIndex, chip)
      return
    }
    if (!current.value) return
    const toIndex = spotAt(event.clientX, event.clientY)
    if (toIndex === undefined) {
      changeBet(current.fromIndex, -current.value)
      return
    }
    if (toIndex === current.fromIndex) return
    moveChip(current.fromIndex, toIndex, current.value)
  }

  const onPointerCancel = (event) => {
    const current = dragRef.current
    if (!current) return
    if (current.pointerId !== event.pointerId) return
    releaseTable(event)
    updateDrag(null)
  }

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      await fetchBalance()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      ref={tableRef}
      className={cn(
        "blackjack-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2 select-none",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] gap-2",
        betting && "touch-none",
        dragging && "cursor-grabbing"
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className={cn("blackjack-status", "flex w-full shrink-0 items-center gap-2")}>
        <Text className={cn("blackjack-rules", "min-w-0 flex-1 truncate text-cs-muted")} size="xs">
          European · S17 · 3:2
        </Text>
        <Text className={cn("blackjack-bankroll", "shrink-0 whitespace-nowrap", bankrollClass(bankroll, maxBet))} size="xs">
          {ethLabel(bankroll, symbol)}
        </Text>
      </div>
      <Card
        className={cn(
          "blackjack-table-card",
          busy && "blackjack-table-card-busy",
          "flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        )}
        padding={0}
      >
        <div className={cn("blackjack-table-frame", "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden")}>
          <div
            className={cn(
              "blackjack-dealer",
              "flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-3 py-3"
            )}
          >
            <span className={cn("blackjack-dealer-label", labelClass)}>00 — House</span>
            <div
              className={cn(
                "blackjack-dealer-tray",
                "flex items-end overflow-visible rounded-[0.75rem] border border-cs-border bg-cs-elevated/80 px-1.5 py-1"
              )}
            >
              {roundDealerCount === 0 &&
                <PlayingCard empty />
              }
              {_.map(roundDealerCards, (card, cardIndex) => (
                <div
                  key={`${card}-${cardIndex}`}
                  className={cn("blackjack-dealer-card", "relative", cardIndex > 0 && "-ml-2")}
                  style={{ zIndex: cardIndex + 1 }}
                >
                  <PlayingCard
                    card={card}
                    delay={cardIndex * 90}
                  />
                </div>
              ))}
            </div>
            <span
              className={cn(
                "blackjack-dealer-total",
                titleClass,
                "h-[1.15rem] text-[1rem]",
                dealerBust && "text-red-500",
                dealerBj && "text-cs-accent",
                !dealerBust && !dealerBj && "text-cs-accent"
              )}
            >
              {roundDealerCount > 0 && dealerTotal}
              {dealerBust &&
                <span className={cn("blackjack-dealer-status", "ml-1 font-sans text-[0.6rem] font-medium tracking-[0.04em]")}>
                  Bust
                </span>
              }
              {dealerBj &&
                <span className={cn("blackjack-dealer-status", "ml-1 font-sans text-[0.6rem] font-medium tracking-[0.04em]")}>
                  Blackjack
                </span>
              }
            </span>
          </div>
          <div className={cn("blackjack-spots", "grid w-full shrink-0 grid-cols-3 items-end gap-2 px-2 pb-2")}>
            {_.map(_.range(SEAT_COUNT), (index) => {
              const current = !betting && currentSeat === index
              return (
                <BlackjackSeat
                  key={index}
                  index={index}
                  seat={seats[index] || {}}
                  bet={shownBets[index] || 0}
                  current={current}
                  currentHand={currentHand}
                  betting={betting && authorized && !busy}
                  busy={busy}
                  dropping={hoverSpot === index}
                  liftedChip={dragging && drag.fromIndex === index ? drag.chipIndex : undefined}
                  prize={seatPrize(paidSeats, index, settled)}
                  result={seatResult(paidSeats, index, settled)}
                  onSpotPointerDown={onSpotPointerDown}
                  onChipPointerDown={onChipPointerDown}
                />
              )
            })}
          </div>
          {busy &&
            <div className={cn("blackjack-loading", "pointer-events-none absolute inset-0 z-[4] flex items-center justify-center")}>
              <div className={cn("blackjack-loading-body", "flex flex-col items-center gap-2")}>
                <div
                  className={cn(
                    "blackjack-loading-ring",
                    "size-8 rounded-full border border-cs-border border-t-cs-accent animate-bj-load"
                  )}
                />
                <span className={cn("blackjack-loading-label", labelClass)}>
                  {betting && "Dealing"}
                  {!betting && "Wait"}
                </span>
              </div>
            </div>
          }
        </div>
      </Card>
      <div className={cn("blackjack-controls", "flex w-full shrink-0 flex-nowrap items-center gap-2")}>
        {!account &&
          <Button className={cn("blackjack-connect", "flex-1")} onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account && !authorized &&
          <Button className={cn("blackjack-deposit", "flex-1")} onClick={() => showModal(SessionModal)}>
            Deposit
          </Button>
        }
        {authorized && betting &&
          <>
            <div className={cn("blackjack-chips", "flex shrink-0 flex-row gap-1.5")}>
              {CHIP_VALUES.map((value) => {
                const isCurrent = value === chip
                if (value > maxBetAmount && !isCurrent) return null
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "blackjack-chip",
                      isCurrent && "blackjack-chip-selected",
                      "size-8 appearance-none rounded-full border-2 border-transparent font-sans text-[0.75rem] font-medium",
                      "transition-[border-color,box-shadow,transform] duration-200",
                      isCurrent && "border-cs-accent shadow-[0_0_0.75rem_var(--color-cs-accent-glow)] scale-[1.06]",
                      value === 0.01 && "bg-gray-50 text-dark-900 outline outline-gray-500",
                      value === 0.05 && "bg-red-600 text-white",
                      value === 0.25 && "bg-teal-600 text-white",
                      value === 1 && "bg-cs-elevated text-cs-text outline outline-cs-border",
                      "cursor-pointer disabled:cursor-default disabled:opacity-40"
                    )}
                    aria-label={ethLabel(value, symbol)}
                    aria-pressed={isCurrent}
                    disabled={busy}
                    onClick={() => setChip(value)}
                  >
                    {chipLabel(value)}
                  </button>
                )
              })}
            </div>
            <Button
              className={cn("blackjack-deal", "flex-1")}
              disabled={!canDeal}
              onClick={() => run(() => dealBlackjack(address, bets))}
            >
              {dealLabel}
            </Button>
          </>
        }
        {authorized && livePlaying &&
          <>
            <Button
              className={cn("blackjack-hit", "flex-1")}
              disabled={busy}
              onClick={() => run(() => hitBlackjack(address))}
            >
              Hit
            </Button>
            <Button
              className={cn("blackjack-stand", "flex-1")}
              variant="outline"
              color="gray"
              disabled={busy}
              onClick={() => run(() => standBlackjack(address))}
            >
              Pass
            </Button>
            {showDouble &&
              <Button
                className={cn("blackjack-double")}
                variant="outline"
                color="gray"
                disabled={busy || !canDouble}
                onClick={() => run(() => doubleBlackjack(address, liveHand.bet))}
              >
                Double
              </Button>
            }
            {showSplit &&
              <Button
                className={cn("blackjack-split")}
                variant="outline"
                color="gray"
                disabled={busy || !canSplit}
                onClick={() => run(() => splitBlackjack(address, liveHand.bet))}
              >
                Split
              </Button>
            }
          </>
        }
      </div>
      {createPortal(
        dragging &&
          <div
            className={cn("blackjack-chip-drag", "pointer-events-none fixed z-[180]")}
            style={{ left: drag.x - 16, top: drag.y - 16 }}
          >
            <ChipMark
              value={drag.value}
              className={cn("blackjack-chip-ghost", "animate-none", removing && "blackjack-chip-removing opacity-45")}
            />
          </div>,
        document.body
      )}
    </div>
  )
})

const spotAt = (x, y) => {
  const node = document.elementFromPoint(x, y)
  if (!node || !node.closest) return
  const spot = node.closest(".blackjack-spot")
  if (!spot) return
  const index = Number(spot.dataset.spot)
  if (!_.isFinite(index)) return
  return index
}

const currentPlaying = (seats, currentSeat, account) => {
  const { player } = seats[currentSeat] || {}
  if (!player || !account) return false
  return ethers.getAddress(player) === ethers.getAddress(account)
}

const onchainBets = (seats) => _.map(seats, (seat) => {
  const { hands = [] } = seat || {}
  return clampEth(_.sumBy(hands, (hand) => clampEth(hand.bet)))
})

const seatPrize = (paidSeats, index, settled) => {
  const { prize } = seatResult(paidSeats, index, settled)
  return prize
}

const seatResult = (paidSeats, index, settled) => {
  if (!settled) return { prize: 0, label: "" }
  const paid = _.find(paidSeats, (row) => row.seat === index) || {}
  const paidOut = clampEth(paid.payout)
  const spent = clampEth(paid.wagered)
  if (paidOut > spent) return { prize: clampEth(paidOut - spent), label: "Win" }
  if (paidOut === spent && spent > 0) return { prize: 0, label: "Push" }
  if (spent > 0) return { prize: 0, label: "Lose" }
  return { prize: 0, label: "" }
}

export default BlackjackGame
