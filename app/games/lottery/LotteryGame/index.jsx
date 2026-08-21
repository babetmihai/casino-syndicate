import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, coverQuote, fetchLottery, selectLottery, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import LotteryMap from "../LotteryMap"
import { cellSpinOrder, seedFromAddress } from "../polygons"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { ethers } from "ethers"

const SPIN_MS = 28
const SLOW_STEPS = 14
const HOLD_MS = 420


const LotteryGame = React.memo(({ address }) => {
  const [buying, setBuying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [litIds, setLitIds] = React.useState([])
  const [showBanner, setShowBanner] = React.useState(false)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const stopFlash = React.useRef()
  const holdTimer = React.useRef()
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize, owners = [], mates = [], pluses = [], matePluses = [], lastTicket, totalBalance } = lottery
  const { assignedCount = 0, settled, playersWin, roundPrize, takenIds = [], plusIds = [], plusLevel = 0, splitIds = [], roundPluses, roundMates, roundMatePluses } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const mineCount = _.filter(owners, (owner, index) => {
    if (index >= (polygonCount || 0)) return false
    return owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  }).length + _.filter(mates, (mate) => {
    return mate && account && ethers.getAddress(mate) === ethers.getAddress(account)
  }).length
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalCells = (polygonCount || 0) + (loseCount || 0)
  const totalPrice = clampEth(ticketPrice)
  const bankroll = clampEth(totalBalance)
  const canCover = bankroll >= coverQuote(lottery, 1)
  const canSpin = account && !buying && roundOpen && canCover && !showBanner && !pending && !revealing
  const isPlus = plusLevel > 0 && !settled
  const isSplit = splitIds.length > 0 && !settled && !isPlus
  const isTaken = takenIds.length > 0 && assignedCount === 0 && !isPlus && !isSplit
  const houseWon = settled && !playersWin
  const playersWon = settled && playersWin
  let flashIds = []
  if (showBanner && isTaken) flashIds = takenIds
  if (showBanner && isPlus) flashIds = plusIds
  let bannerLabel
  let bannerHero
  if (isTaken) bannerLabel = "Taken"
  if (isSplit) bannerLabel = "Split"
  if (isPlus) {
    bannerLabel = "Heat"
    bannerHero = `+${plusLevel}`
  }
  if (houseWon) bannerLabel = "House"
  if (playersWon) {
    bannerLabel = "Players"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (playersWon) heroClass = "text-[1.75rem]"
  const redsLeft = (loseCount || 0) - (loseLit || 0)
  let mapPluses = pluses
  let mapMates = mates
  let mapMatePluses = matePluses
  if (pending && roundPluses && roundPluses.length) mapPluses = roundPluses
  if (pending && roundMates && roundMates.length) mapMates = roundMates
  if (pending && roundMatePluses && roundMatePluses.length) mapMatePluses = roundMatePluses
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
      const ticket = await buyLotteryTicket(address)
      if (!ticket) return
      const draws = ticket.draws || []
      const winners = _.map(draws, "polygonId")
      setRevealing(true)
      if (winners.length > 0) {
        await flashAll(totalCells, winners, setLitIds, stopFlash, cellSpinOrder(seedFromAddress(address), totalCells, polygonCount))
      }
      await fetchLottery(address)
      if (account) fetchBalance(account)
      const charged = (ticket.plusLevel || 0) > 0
      const split = (ticket.splitIds || []).length > 0
      const taken = (ticket.takenIds || []).length > 0 && (ticket.assignedCount || 0) === 0 && !charged && !split
      if (charged || taken || split || ticket.settled) setShowBanner(true)
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
          {redsLeft} reds
        </Text>
        <Text className={cn("lottery-prize", "shrink-0 whitespace-nowrap")} size="xs" c="dimmed">
          {ethLabel(prize, symbol)}
        </Text>
        <Text className={cn("lottery-bankroll", "shrink-0 whitespace-nowrap", bankrollClass(bankroll, ticketPrice))} size="xs">
          {ethLabel(bankroll, symbol)}
        </Text>
      </div>
      <Card className={cn("lottery-map-card", "flex min-h-0 w-full flex-1 flex-col overflow-hidden")} padding={0}>
        <div className={cn("lottery-map-frame", "relative flex min-h-0 w-full flex-1 p-1.5")}>
          <LotteryMap
            address={address}
            owners={owners}
            mates={mapMates}
            pluses={mapPluses}
            matePluses={mapMatePluses}
            polygonCount={polygonCount}
            loseCount={loseCount}
            account={account}
            flashIds={flashIds}
            litIds={litIds}
            plusIds={isPlus ? plusIds : []}
            splitIds={isSplit ? splitIds : []}
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
        showBanner && !revealing && bannerLabel &&
          <div className={cn(
            "lottery-banner",
            "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner"
          )}>
            <Card
              className={cn(
                "lottery-banner-card",
                houseWon && "lottery-banner-house",
                isTaken && "lottery-banner-taken",
                isSplit && "lottery-banner-split",
                isPlus && "lottery-banner-plus",
                "flex min-w-36 flex-col items-center gap-1 text-center animate-banner",
                playersWon && "bg-cs-accent text-cs-bg",
                houseWon && "bg-cs-accent-2 text-white",
                isPlus && "bg-cs-accent text-cs-bg",
                isSplit && "bg-cs-accent text-cs-bg",
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


const flashAll = (count, winners, setLitIds, stopFlash, order) => {
  return new Promise((resolve) => {
    if (!count || winners.length === 0) {
      resolve()
      return
    }
    let wheel = order
    if (!wheel || wheel.length !== count) wheel = _.range(count)
    const n = winners.length
    const positions = _.map(winners, () => _.random(0, count - 1))
    const publish = () => setLitIds(_.uniq(positions))
    const stops = []
    let finished = 0
    _.forEach(winners, (winner, i) => {
      const stop = runPolygonFlash({
        from: positions[i],
        wheel,
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

const runPolygonFlash = ({ from, wheel, getWinner, onTick, onDone }) => {
  let timer
  let stopped = false
  let steps = 0
  const n = wheel.length
  let startIndex = _.indexOf(wheel, from)
  if (startIndex < 0) startIndex = 0
  let index = startIndex
  onTick(wheel[index])

  const tick = () => {
    if (stopped) return
    index = (index + 1) % n
    steps += 1

    const winner = getWinner()
    let delay = SPIN_MS
    if (_.isNumber(winner)) {
      const winnerIndex = _.indexOf(wheel, winner)
      const distance = (winnerIndex - startIndex + n) % n
      const minSteps = n * 2 + distance
      if (steps >= minSteps && index === winnerIndex) {
        onTick(wheel[index])
        onDone(winner)
        return
      }
      let remaining = minSteps - steps
      if (steps >= minSteps) remaining = (winnerIndex - index + n) % n
      if (remaining <= SLOW_STEPS) {
        const t = 1 - remaining / SLOW_STEPS
        delay = SPIN_MS + t * t * t * 320
      }
    }

    onTick(wheel[index])
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, SPIN_MS)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
