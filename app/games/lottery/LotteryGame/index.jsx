import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, fetchLottery, selectLottery, TICKET_MULTIPLIERS, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import LotteryMap from "../LotteryMap"
import { cellNumber } from "../polygons"
import { clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { ethers } from "ethers"

const SPIN_MS = 45
const SLOW_STEPS = 22
const HOLD_MS = 700


const LotteryGame = React.memo(({ address }) => {
  const [buying, setBuying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [litIds, setLitIds] = React.useState([])
  const [showBanner, setShowBanner] = React.useState(false)
  const [multiplier, setMultiplier] = React.useState(1)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const stopFlash = React.useRef()
  const holdTimer = React.useRef()
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize, owners = [], lastTicket, totalBalance } = lottery
  const { polygonId, assignedCount = 0, winAssignedCount = 0, loseAssignedCount = 0, settled, playersWin, roundPrize, takenIds = [] } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const mineCount = _.filter(owners, (owner, index) => {
    if (index >= (polygonCount || 0)) return false
    return owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  }).length
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalCells = (polygonCount || 0) + (loseCount || 0)
  const totalPrice = clampEth(ticketPrice) * multiplier
  const canCover = clampEth(totalBalance) >= clampEth(prize) + totalPrice
  const canSpin = account && !buying && roundOpen && canCover && !showBanner && !pending && !revealing
  const isWin = winAssignedCount > 0
  const isHouseHit = loseAssignedCount > 0 && winAssignedCount === 0
  const isTaken = takenIds.length > 0 && assignedCount === 0
  const houseWon = settled && !playersWin
  const playersWon = settled && playersWin
  let focusId
  if (showBanner && isWin && !settled) focusId = polygonId
  let flashIds = []
  if (showBanner) flashIds = takenIds
  let bannerLabel = "Taken"
  let bannerHero
  if (_.isNumber(polygonId)) bannerHero = cellNumber(polygonId, polygonCount || 0)
  if (isHouseHit) {
    bannerLabel = "House cell"
    bannerHero = cellNumber(polygonId, polygonCount || 0)
    if (loseAssignedCount > 1) {
      bannerLabel = "House cells"
      bannerHero = loseAssignedCount
    }
  }
  if (winAssignedCount === 1) {
    bannerLabel = "Winning cell"
    bannerHero = cellNumber(polygonId, polygonCount || 0)
  }
  if (winAssignedCount > 1) {
    bannerLabel = "Winning cells"
    bannerHero = winAssignedCount
  }
  if (isTaken) {
    bannerLabel = "Taken"
  }
  if (houseWon) {
    bannerLabel = "House"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  if (playersWon) {
    bannerLabel = "Players"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (houseWon || playersWon) heroClass = "text-[1.75rem]"
  let spinLabel = `Hold to spin · ${ethLabel(totalPrice, symbol)}`
  if (buying || revealing) spinLabel = "Spinning"
  if (!roundOpen) spinLabel = "Closed"
  if (roundOpen && !canCover) spinLabel = "Low bankroll"

  React.useEffect(() => {
    fetchLottery(address)
    watchLottery(address)
    return () => unwatchLottery(address)
  }, [address, account])

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  React.useEffect(() => {
    if (!showBanner) return
    const timer = _.delay(() => setShowBanner(false), 2500)
    return () => clearTimeout(timer)
  }, [showBanner])

  const onClaim = async () => {
    if (!hasPrize || claiming) return
    setClaiming(true)
    try {
      await withdrawLotteryPrize(address)
      if (account) fetchBalance(account)
    } finally {
      setClaiming(false)
    }
  }

  const onBuy = async () => {
    if (!canSpin) return
    setBuying(true)
    unwatchLottery(address)
    try {
      const ticket = await buyLotteryTicket(address, multiplier)
      if (!ticket) return
      const draws = ticket.draws || []
      const winners = _.map(draws, "polygonId")
      setRevealing(true)
      if (winners.length > 0) {
        await flashAll(totalCells, winners, setLitIds, stopFlash)
      }
      await fetchLottery(address)
      if (account) fetchBalance(account)
      setShowBanner(true)
    } finally {
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      setRevealing(false)
      setLitIds([])
      setBuying(false)
      watchLottery(address)
    }
  }

  const cancelSpinHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setHoldingSpin(false)
  }

  const startSpinHold = (event) => {
    if (!canSpin) return
    if (event.button > 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setHoldingSpin(true)
    holdTimer.current = _.delay(() => {
      holdTimer.current = null
      setHoldingSpin(false)
      onBuy()
    }, 1000)
  }

  return (
    <div
      className={cn(
        "lottery-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2"
      )}
    >
      <div className={cn("lottery-status", "flex w-full shrink-0 items-center gap-2")}>
        <Text className={cn("lottery-claimed", "min-w-0 flex-1 truncate")} size="xs">
          {claimedCount || 0}/{polygonCount || 0} claimed
          {account && ` · you ${mineCount}`}
        </Text>
        <Text className={cn("lottery-lose", "shrink-0 whitespace-nowrap")} size="xs" c="dimmed">
          {loseLit || 0}/{loseCount || 0} lose
        </Text>
        <Text className={cn("lottery-prize", "shrink-0 whitespace-nowrap text-cs-accent")} size="xs">
          {ethLabel(prize, symbol)}
        </Text>
      </div>
      <Card className={cn("lottery-map-card", "flex min-h-0 w-full flex-1 flex-col overflow-hidden")} padding={0}>
        <div className={cn("lottery-map-frame", "relative flex min-h-0 w-full flex-1 p-1.5")}>
          <LotteryMap
            address={address}
            owners={owners}
            polygonCount={polygonCount}
            loseCount={loseCount}
            account={account}
            focusId={focusId}
            flashIds={flashIds}
            litIds={litIds}
            celebrate={pending && !revealing && playersWin !== false}
          />
          {account && hasPrize && !revealing &&
            <div className={cn("lottery-claim-wrap", "absolute inset-0 z-10 flex items-center justify-center")}>
              <Button
                className={cn("lottery-claim")}
                loading={claiming}
                onClick={onClaim}
              >
                Claim {ethLabel(myPrize, symbol)}
              </Button>
            </div>
          }
        </div>
      </Card>
      <div className={cn("lottery-controls", "flex w-full shrink-0 flex-wrap items-center gap-2")}>
        {!account &&
          <Button className={cn("lottery-connect", "flex-1")} onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account && !pending &&
          <div className={cn("lottery-multipliers", "flex shrink-0 flex-row gap-1.5")}>
            {TICKET_MULTIPLIERS.map((value) => {
              const isCurrent = value === multiplier
              return (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "lottery-multiplier",
                    isCurrent && "lottery-multiplier-selected",
                    "size-8 appearance-none rounded-[0.75rem] border-2 border-transparent font-sans text-[0.75rem] font-medium",
                    "bg-cs-elevated text-cs-text outline outline-cs-border",
                    isCurrent && "border-cs-accent text-cs-accent shadow-[0_0_0.75rem_var(--color-cs-accent-glow)]",
                    "cursor-pointer disabled:cursor-default disabled:opacity-40"
                  )}
                  aria-pressed={isCurrent}
                  disabled={!canSpin}
                  onClick={() => setMultiplier(value)}
                >
                  x{value}
                </button>
              )
            })}
          </div>
        }
        {account && !pending &&
          <button
            type="button"
            className={cn(
              "lottery-spin",
              "group relative inline-flex min-h-8 min-w-0 flex-1 appearance-none items-center justify-center overflow-hidden",
              "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
              "leading-normal tracking-[0.06em] uppercase text-cs-text",
              "cursor-pointer touch-none select-none transition-[border-color,color] [-webkit-touch-callout:none]",
              "enabled:hover:border-cs-border-hover enabled:hover:text-cs-accent",
              "disabled:cursor-default disabled:opacity-40",
              "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg"
            )}
            data-holding={holdingSpin}
            disabled={!canSpin}
            onPointerDown={startSpinHold}
            onPointerUp={cancelSpinHold}
            onPointerCancel={cancelSpinHold}
            onLostPointerCapture={cancelSpinHold}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span
              className={cn(
                "lottery-spin-fill",
                "absolute inset-0 w-0 bg-cs-accent transition-[width] duration-150",
                "group-data-[holding=true]:w-full group-data-[holding=true]:duration-1000",
                "group-data-[holding=true]:ease-linear"
              )}
            />
            <span className={cn("lottery-spin-label", "relative z-[1] truncate")}>{spinLabel}</span>
          </button>
        }
      </div>
      {createPortal(
        showBanner && !revealing &&
          <div className={cn(
            "lottery-banner",
            "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner"
          )}>
            <Card
              className={cn(
                "lottery-banner-card",
                isWin && "lottery-banner-win",
                houseWon && "lottery-banner-house",
                isTaken && "lottery-banner-taken",
                isHouseHit && !settled && "lottery-banner-miss",
                !isWin && !isTaken && !isHouseHit && !houseWon && "lottery-banner-miss",
                "flex min-w-36 flex-col items-center gap-1 text-center animate-banner",
                playersWon && "bg-teal-600 text-white",
                isWin && !settled && "bg-teal-600 text-white",
                (houseWon || isHouseHit) && "bg-red-600 text-white",
                isTaken && "border-cs-border bg-cs-elevated"
              )}
              shadow="md"
              withBorder={false}
            >
              <Text className={cn("lottery-banner-label", "opacity-80")} size="sm">
                {bannerLabel}
              </Text>
              {bannerHero &&
                <Text className={cn("lottery-banner-number", "font-headings leading-none font-extrabold", heroClass)}>
                  {bannerHero}
                </Text>
              }
            </Card>
          </div>,
        document.body
      )}
    </div>
  )
})

export default LotteryGame


const flashAll = (count, winners, setLitIds, stopFlash) => {
  return new Promise((resolve) => {
    if (!count || winners.length === 0) {
      resolve()
      return
    }
    const n = winners.length
    const positions = _.map(winners, () => _.random(0, count - 1))
    const publish = () => setLitIds(_.uniq(positions))
    const stops = []
    let finished = 0
    _.forEach(winners, (winner, i) => {
      const stop = runPolygonFlash({
        from: positions[i],
        count,
        getWinner: () => winner,
        onTick: (id) => {
          positions[i] = id
          publish()
        },
        onDone: () => {
          positions[i] = winner
          publish()
          finished += 1
          if (finished !== n) return
          _.delay(resolve, HOLD_MS)
        }
      })
      stops.push(stop)
    })
    stopFlash.current = () => {
      _.forEach(stops, (fn) => fn())
    }
  })
}

const runPolygonFlash = ({ from, count, getWinner, onTick, onDone }) => {
  let timer
  let stopped = false
  let steps = 0
  let order = _.shuffle(_.range(count))
  let cursor = 0
  if (_.isNumber(from)) {
    const found = _.indexOf(order, from)
    if (found >= 0) cursor = found
  }
  let index = order[cursor]
  onTick(index)

  const tick = () => {
    if (stopped) return
    steps += 1

    const winner = getWinner()
    let delay = SPIN_MS
    if (_.isNumber(winner)) {
      const minSteps = count * 2
      if (steps >= minSteps) {
        onTick(winner)
        onDone(winner)
        return
      }
      const remaining = minSteps - steps
      if (remaining <= SLOW_STEPS) {
        const t = 1 - remaining / SLOW_STEPS
        delay = SPIN_MS + t * t * t * 560
      }
    }

    cursor += 1
    if (cursor >= order.length) {
      order = _.shuffle(_.range(count))
      cursor = 0
      if (order[0] === index && count > 1) cursor = 1
    }
    index = order[cursor]
    onTick(index)
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, SPIN_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
