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
  insureBlackjack,
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
import { canSplitCards, handValue, isAce, takeCards, PHASE, SEAT_COUNT, STATUS } from "../cards"
import BlackjackSeat from "../BlackjackSeat"
import PlayingCard from "./PlayingCard"
import ChipMark from "./ChipMark"

const HOLD_FILL_MS = 1000
const DRAG_THRESHOLD = 8
const emptyBets = () => _.range(SEAT_COUNT).fill(0)

const originalBet = (hands) => clampEth((hands[0] || {}).bet)


const BlackjackGame = React.memo(({ address }) => {
  const [chip, setChip] = React.useState(CHIP_VALUES[0])
  const [bets, setBets] = React.useState(emptyBets)
  const [busy, setBusy] = React.useState(false)
  const [holdingDeal, setHoldingDeal] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [drag, setDrag] = React.useState(null)
  const holdTimer = React.useRef(null)
  const dealingRef = React.useRef(false)
  const dragRef = React.useRef(null)
  const primedRound = React.useRef(false)
  const seenRound = React.useRef()
  const { account, session, balance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const table = useSelector(() => selectBlackjack(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    lastRound, minBet, maxBet, totalBalance, phase, currentSeat, currentHand,
    dealerCount, dealerCards = [], seats = []
  } = table
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  const bankroll = clampEth(totalBalance)
  const playBalance = clampEth(balance)
  const betting = phase !== PHASE.Acting
  const totalBet = clampEth(_.sum(bets))
  const canCover = totalBet * 8 <= bankroll + totalBet
  const myTurn = !betting && currentPlaying(seats, currentSeat, account)
  const liveSeat = seats[currentSeat] || {}
  const liveHands = liveSeat.hands || []
  const liveHand = liveHands[currentHand] || {}
  const liveCards = takeCards(liveHand)
  const livePlaying = myTurn && liveHand.status === STATUS.Playing
  const canDouble = livePlaying && liveCards.length === 2 && clampEth(liveHand.bet) > 0
  const canAffordDouble = canDouble && playBalance >= clampEth(liveHand.bet)
  const canSplitShow = livePlaying && liveCards.length === 2 && currentHand === 0
    && (liveHands[1] || {}).status === STATUS.Empty
  const canSplit = canSplitShow && canSplitCards(liveCards) && playBalance >= clampEth(liveHand.bet)
  const dealerUp = dealerCards[0]
  const canInsure = livePlaying && liveCards.length === 2 && isAce(dealerUp) && clampEth(liveSeat.insurance) === 0
    && (liveHands[1] || {}).status === STATUS.Empty && playBalance >= clampEth(originalBet(liveHands) / 2)
  const canDeal = authorized && betting && totalBet > 0 && totalBet <= playBalance && canCover
    && !busy && !holdingDeal && !showBanner
  const { total: dealerTotal } = handValue(dealerCards)
  const { payout = 0, wagered = 0, dealerTotal: roundDealer } = lastRound || {}
  const won = clampEth(payout) > clampEth(wagered)
  const pushed = clampEth(payout) === clampEth(wagered) && clampEth(wagered) > 0
  let dealLabel = "Hold to deal"
  if (holdingDeal || busy) dealLabel = "Dealing"
  let loadLabel = "Wait"
  if (holdingDeal) loadLabel = "Dealing"
  let bannerLabel = "Dealer"
  if (won) bannerLabel = "You win"
  if (pushed) bannerLabel = "Push"
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

  React.useEffect(() => {
    const { id, paidSeats = [] } = lastRound || {}
    if (!primedRound.current) {
      if (id) primedRound.current = true
      seenRound.current = id
      return
    }
    if (!id || id === seenRound.current) return
    seenRound.current = id
    if (clampEth(wagered) <= 0) return
    setBets((current) => {
      const next = [...current]
      _.forEach(paidSeats, (paid) => {
        const { seat, payout: paidOut } = paid || {}
        if (clampEth(paidOut) <= 0) next[seat] = 0
      })
      return next
    })
    setShowBanner(true)
  }, [lastRound])

  React.useEffect(() => {
    if (!showBanner) return
    const timer = _.delay(() => setShowBanner(false), 2500)
    return () => clearTimeout(timer)
  }, [showBanner])

  const commitBets = (nextBets) => {
    const nextTotal = clampEth(_.sum(nextBets))
    if (nextTotal > playBalance) return
    if (nextTotal * 8 > bankroll + nextTotal) return
    setBets(nextBets)
  }

  const changeBet = (index, amount) => {
    if (!betting || !authorized || busy || holdingDeal) return
    const nextBets = [...bets]
    let nextValue = addEth(nextBets[index], amount)
    if (amount > 0 && nextValue > 0 && nextValue < minBetAmount) nextValue = minBetAmount
    if (nextValue > maxBetAmount) nextValue = maxBetAmount
    nextBets[index] = nextValue
    commitBets(nextBets)
  }

  const moveChip = (fromIndex, toIndex, value) => {
    if (!betting || !authorized || busy || holdingDeal) return
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

  const onSpotPointerDown = (event, index) => {
    if (!betting || !authorized || busy || holdingDeal) return
    if (event.button > 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
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
    if (!betting || !authorized || busy || holdingDeal) return
    if (event.button > 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
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

  const run = async (fn) => {
    if (busy || dealingRef.current) return
    setBusy(true)
    try {
      await fn()
      await fetchBalance()
    } finally {
      setBusy(false)
    }
  }

  const cancelDealHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
      dealingRef.current = false
    }
    setHoldingDeal(false)
  }

  const startDealHold = (event) => {
    if (!canDeal) return
    if (event.button > 0) return
    if (holdTimer.current || dealingRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dealingRef.current = true
    setHoldingDeal(true)
    holdTimer.current = _.delay(async () => {
      holdTimer.current = null
      setHoldingDeal(false)
      setBusy(true)
      try {
        await dealBlackjack(address, bets)
        await fetchBalance()
      } finally {
        dealingRef.current = false
        setBusy(false)
      }
    }, HOLD_FILL_MS)
  }

  return (
    <div
      className={cn(
        "blackjack-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2 select-none",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] gap-2",
        dragging && "touch-none"
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => updateDrag(null)}
    >
      <div className={cn("blackjack-status", "flex w-full shrink-0 items-center justify-between gap-2")}>
        <div className={cn("blackjack-heading", "min-w-0")}>
          <div className={cn("blackjack-kicker", labelClass)}>01 — Blackjack</div>
          <p className={cn("blackjack-rules", "mt-0.5 mb-0 truncate text-[0.7rem] text-cs-muted")}>
            European · S17 · 3:2
          </p>
        </div>
        <div className={cn("blackjack-bankroll", titleClass, "shrink-0 text-[0.95rem]", bankrollClass(bankroll, maxBet))}>
          {ethLabel(bankroll, symbol)}
        </div>
      </div>
      <Card
        className={cn(
          "blackjack-table-card",
          (busy || holdingDeal) && "blackjack-table-card-busy",
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
                "flex items-end rounded-[0.75rem] border border-cs-border bg-cs-elevated/80 px-1.5 py-1"
              )}
            >
              {dealerCount === 0 &&
                <PlayingCard empty />
              }
              {_.map(dealerCards, (card, cardIndex) => (
                <div
                  key={`${card}-${cardIndex}`}
                  className={cn("blackjack-dealer-card", cardIndex > 0 && "-ml-4")}
                  style={{ zIndex: cardIndex }}
                >
                  <PlayingCard
                    card={card}
                    delay={cardIndex * 90}
                  />
                </div>
              ))}
            </div>
            <span className={cn("blackjack-dealer-total", titleClass, "h-[1.15rem] text-[1rem] text-cs-accent")}>
              {dealerCount > 0 && dealerTotal}
            </span>
          </div>
          <div className={cn("blackjack-spots", "grid w-full shrink-0 grid-cols-5 items-end gap-1 px-1.5 pb-2")}>
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
                  onSpotPointerDown={onSpotPointerDown}
                  onChipPointerDown={onChipPointerDown}
                />
              )
            })}
          </div>
          {(busy || holdingDeal) &&
            <div className={cn("blackjack-loading", "pointer-events-none absolute inset-0 z-[4] flex items-center justify-center")}>
              <div className={cn("blackjack-loading-body", "flex flex-col items-center gap-2")}>
                <div
                  className={cn(
                    "blackjack-loading-ring",
                    "size-8 rounded-full border border-cs-border border-t-cs-accent animate-bj-load"
                  )}
                />
                <span className={cn("blackjack-loading-label", labelClass)}>{loadLabel}</span>
              </div>
            </div>
          }
        </div>
      </Card>
      <div className={cn("blackjack-controls", "flex w-full shrink-0 flex-col gap-2")}>
        {!account &&
          <Button className={cn("blackjack-connect", "min-h-11 w-full")} onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account && !authorized &&
          <Button className={cn("blackjack-deposit", "min-h-11 w-full")} onClick={() => showModal(SessionModal)}>
            Deposit
          </Button>
        }
        {authorized && betting &&
          <>
            <div className={cn("blackjack-chips", "flex w-full flex-row justify-between gap-1.5")}>
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
                      "size-10 appearance-none rounded-full border-2 border-transparent font-sans text-[0.75rem] font-medium",
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
            <button
              type="button"
              className={cn(
                "blackjack-deal",
                "group relative inline-flex min-h-11 w-full appearance-none items-center justify-center overflow-hidden",
                "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
                "leading-normal tracking-[0.06em] uppercase text-cs-text",
                "cursor-pointer touch-manipulation touch-none select-none [-webkit-touch-callout:none]",
                "enabled:hover:border-cs-border-hover enabled:hover:text-cs-accent",
                "disabled:cursor-default",
                !busy && "disabled:opacity-40",
                "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg",
                "data-[spinning=true]:border-cs-accent data-[spinning=true]:text-cs-bg"
              )}
              data-holding={holdingDeal}
              data-spinning={busy && !holdingDeal}
              disabled={!canDeal && !holdingDeal}
              onPointerDown={startDealHold}
              onPointerUp={cancelDealHold}
              onPointerCancel={cancelDealHold}
              onLostPointerCapture={cancelDealHold}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span
                className={cn(
                  "blackjack-deal-fill",
                  "absolute inset-0 w-0 bg-cs-accent transition-[width] duration-150",
                  "group-data-[holding=true]:w-full group-data-[holding=true]:duration-1000",
                  "group-data-[holding=true]:ease-linear",
                  "group-data-[spinning=true]:w-full group-data-[spinning=true]:duration-200"
                )}
              />
              <span className={cn("blackjack-deal-label", "relative z-[1] truncate")}>{dealLabel}</span>
            </button>
          </>
        }
        {authorized && livePlaying &&
          <div className={cn("blackjack-actions", "grid w-full grid-cols-2 gap-2")}>
            <Button
              className={cn("blackjack-hit", "min-h-11")}
              disabled={busy}
              onClick={() => run(() => hitBlackjack(address))}
            >
              Hit
            </Button>
            <Button
              className={cn("blackjack-stand", "min-h-11")}
              variant="outline"
              color="gray"
              disabled={busy}
              onClick={() => run(() => standBlackjack(address))}
            >
              Stand
            </Button>
            {canDouble &&
              <Button
                className={cn("blackjack-double", "min-h-11")}
                variant="outline"
                color="gray"
                disabled={busy || !canAffordDouble}
                onClick={() => run(() => doubleBlackjack(address, liveHand.bet))}
              >
                Double
              </Button>
            }
            {canSplitShow &&
              <Button
                className={cn("blackjack-split", "min-h-11")}
                variant="outline"
                color="gray"
                disabled={busy || !canSplit}
                onClick={() => run(() => splitBlackjack(address, liveHand.bet))}
              >
                Split
              </Button>
            }
            {canInsure &&
              <Button
                className={cn("blackjack-insure", "min-h-11 col-span-2")}
                variant="outline"
                color="gray"
                disabled={busy}
                onClick={() => run(() => insureBlackjack(address, clampEth(originalBet(liveHands) / 2)))}
              >
                Insure
              </Button>
            }
          </div>
        }
      </div>
      {dragging &&
        <div
          className={cn("blackjack-chip-drag", "pointer-events-none fixed z-[180]")}
          style={{ left: drag.x - 16, top: drag.y - 16 }}
        >
          <ChipMark
            value={drag.value}
            className={cn("blackjack-chip-ghost", "animate-none", removing && "blackjack-chip-removing opacity-45")}
          />
        </div>
      }
      {createPortal(
        showBanner &&
          <div className={cn("blackjack-banner", "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner")}>
            <Card
              className={cn(
                "blackjack-banner-card",
                won && "blackjack-banner-win",
                !won && pushed && "blackjack-banner-push",
                !won && !pushed && "blackjack-banner-house",
                "flex min-w-36 flex-col items-center gap-1 text-center animate-banner-card",
                won && "border-transparent bg-cs-accent text-cs-bg",
                pushed && "border-cs-border bg-cs-elevated text-cs-text",
                !won && !pushed && "border-transparent bg-cs-accent-2 text-white"
              )}
              shadow="md"
              withBorder={false}
            >
              <Text className={cn("blackjack-banner-label", "text-[0.75rem] tracking-[0.15em] uppercase opacity-80")}>
                {bannerLabel}
              </Text>
              <Text className={cn("blackjack-banner-number", titleClass, "text-[2.75rem] leading-none font-extrabold")}>
                {roundDealer}
              </Text>
              <Text className={cn("blackjack-banner-win", "tracking-[0.04em]")} size="sm">
                {won && `Won ${ethLabel(payout, symbol)}`}
                {pushed && `Returned ${ethLabel(payout, symbol)}`}
                {!won && !pushed && `Lost ${ethLabel(wagered, symbol)}`}
              </Text>
            </Card>
          </div>,
        document.body
      )}
    </div>
  )
})

const spotAt = (x, y) => {
  const nodes = document.querySelectorAll(".blackjack-spot-circle")
  let match
  let best = Infinity
  _.forEach(nodes, (node) => {
    const box = node.getBoundingClientRect()
    const dx = x - (box.left + box.width / 2)
    const dy = y - (box.top + box.height / 2)
    const reach = Math.max(box.width, box.height) * 0.75
    const dist = Math.hypot(dx, dy)
    if (dist > reach) return
    if (dist >= best) return
    best = dist
    match = Number(node.dataset.spot)
  })
  return match
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

export default BlackjackGame
