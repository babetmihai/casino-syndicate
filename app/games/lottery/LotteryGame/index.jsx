import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, fetchLottery, selectLottery, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import SessionModal, { requirePlayWallet } from "app/core/auth/SessionModal"
import LotteryMap from "../LotteryMap"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { buildPolygons, seedFromAddress } from "../polygons"
import { ethers } from "ethers"

const SPIN_MS = 24
const WIND_MS = 140
const SLOW_STEPS = 7
const SLOW_EXTRA = 180
const HOLD_MS = 160
const HOLD_FILL_MS = 1000
const CLEAR_MS = 180
const BANNER_MS = 2500
const BANNER_LONG_MS = 4500
const TRAIL = 4


const LotteryGame = React.memo(({ address }) => {
  const [buying, setBuying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [litIds, setLitIds] = React.useState([])
  const [landed, setLanded] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const stopFlash = React.useRef()
  const holdTimer = React.useRef()
  const pendingWinner = React.useRef()
  const spinDone = React.useRef()
  const holdStart = React.useRef()
  const committed = React.useRef(false)
  const boardSnap = React.useRef()
  const spinningRef = React.useRef(false)
  const seenHouseSettle = React.useRef()
  const { account, session, balance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize,
    owners = [], mates = [], lastTicket, totalBalance, livePlayers = [], lastSettle
  } = lottery
  const { settled, playersWin, roundPrize, splitIds = [], roundMates } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const showClaim = Boolean(account && hasPrize && !revealing && !showBanner)
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalCells = (polygonCount || 0) + (loseCount || 0)
  const totalPrice = clampEth(ticketPrice)
  const bankroll = clampEth(totalBalance)
  const pot = clampEth(prize)
  const canSpin = authorized && clampEth(balance) >= totalPrice && !buying && roundOpen && !showBanner && !pending && !revealing
  const isSplit = splitIds.length > 0 && !settled
  const houseFromWatch = lastSettle && !lastSettle.playersWin && account && _.includes(livePlayers, ethers.getAddress(account))
  const houseWon = (settled && !playersWin) || houseFromWatch
  const playersWon = settled && playersWin
  let flashIds = []
  if (landed) flashIds = _.take(litIds, 1)
  if (showClaim) flashIds = []
  let bannerLabel
  let bannerHero
  if (houseWon) bannerLabel = "House"
  if (playersWon) {
    bannerLabel = "Players"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (playersWon) heroClass = "text-[1.75rem]"
  let cardAnim = "animate-banner-card"
  if (playersWon) cardAnim = "animate-banner-card-long"
  const hideResult = holdingSpin || revealing
  let mapOwners = owners
  let mapMates = mates
  if (pending && roundMates && roundMates.length) mapMates = roundMates
  if (hideResult && boardSnap.current) {
    mapOwners = boardSnap.current.owners
    mapMates = boardSnap.current.mates
  }
  const mineCount = _.filter(_.take(mapOwners, polygonCount || 0), (owner) => {
    return owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  }).length + _.filter(mapMates, (mate) => {
    return mate && account && ethers.getAddress(mate) === ethers.getAddress(account)
  }).length
  let shownClaimed = claimedCount || 0
  let shownLose = loseLit || 0
  if (hideResult && boardSnap.current) {
    shownClaimed = boardSnap.current.claimedCount || 0
    shownLose = boardSnap.current.loseLit || 0
  }
  if (account) shownClaimed = mineCount
  let spinLabel = `Hold to spin · ${ethLabel(totalPrice, symbol)}`
  if (buying || revealing) spinLabel = "Spinning"
  if (!roundOpen) spinLabel = "Closed"

  React.useEffect(() => {
    if (holdingSpin || revealing || buying) {
      unwatchLottery(address)
      return
    }
    fetchLottery(address)
    watchLottery(address)
    return () => unwatchLottery(address)
  }, [address, account, holdingSpin, revealing, buying])

  React.useEffect(() => {
    if (!account) return
    fetchBalance()
  }, [account])

  React.useEffect(() => {
    const settleId = lastSettle && lastSettle.id
    if (!settleId) return
    if (settleId === seenHouseSettle.current) return
    if (!houseFromWatch) return
    seenHouseSettle.current = settleId
    if (revealing || buying || holdingSpin) return
    setShowBanner(true)
  }, [lastSettle, houseFromWatch, revealing, buying, holdingSpin])

  React.useEffect(() => {
    if (!showBanner) return
    let wait = BANNER_MS
    if (playersWon) wait = BANNER_LONG_MS
    if (!bannerLabel) wait = HOLD_MS
    const timer = _.delay(() => {
      setShowBanner(false)
      setLitIds([])
      setLanded(false)
    }, wait)
    return () => clearTimeout(timer)
  }, [showBanner])

  React.useEffect(() => {
    if (revealing) return
    if (!landed) return
    if (showBanner) return
    const timer = _.delay(() => {
      setLitIds([])
      setLanded(false)
    }, CLEAR_MS)
    return () => clearTimeout(timer)
  }, [revealing, landed, showBanner])

  const onClaim = async () => {
    if (!hasPrize || claiming) return
    if (!requirePlayWallet()) return
    setClaiming(true)
    try {
      await withdrawLotteryPrize(address)
      fetchBalance()
    } finally {
      setClaiming(false)
    }
  }

  const onBuy = async () => {
    setBuying(true)
    setRevealing(true)
    let keepLit = false
    try {
      const ticket = await buyLotteryTicket(address)
      if (!ticket) return
      const draws = ticket.draws || []
      const winner = _.last(_.map(draws, "polygonId"))
      pendingWinner.current = winner
      if (_.isNumber(winner) && spinDone.current) await spinDone.current
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      spinDone.current = undefined
      const showResult = ticket.settled
      await fetchLottery(address)
      fetchBalance()
      keepLit = true
      setBuying(false)
      setRevealing(false)
      if (showResult) {
        setShowBanner(true)
      }
    } finally {
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      spinDone.current = undefined
      setRevealing(false)
      setBuying(false)
      if (!keepLit) {
        setLitIds([])
        setLanded(false)
      }
      spinningRef.current = false
    }
  }

  const cancelSpinHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      spinDone.current = undefined
      committed.current = false
      boardSnap.current = undefined
      spinningRef.current = false
      setRevealing(false)
      setLitIds([])
      setLanded(false)
    }
    setHoldingSpin(false)
  }

  const startSpinHold = (event) => {
    if (!canSpin) return
    if (event.button > 0) return
    if (holdTimer.current || spinningRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    spinningRef.current = true
    unwatchLottery(address)
    setHoldingSpin(true)
    setLanded(false)
    pendingWinner.current = undefined
    committed.current = false
    boardSnap.current = {
      owners,
      mates,
      claimedCount,
      loseLit
    }
    holdStart.current = Date.now()
    spinDone.current = flashAll(address, totalCells, polygonCount || 0, setLitIds, setLanded, stopFlash, {
      getWinner: () => pendingWinner.current,
      getCruiseDelay: () => {
        if (committed.current) return SPIN_MS
        const t = _.clamp((Date.now() - holdStart.current) / HOLD_FILL_MS, 0, 1)
        return WIND_MS + t * t * (SPIN_MS - WIND_MS)
      }
    })
    holdTimer.current = _.delay(() => {
      holdTimer.current = null
      committed.current = true
      setHoldingSpin(false)
      onBuy()
    }, HOLD_FILL_MS)
  }

  return (
    <div
      className={cn(
        "lottery-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2 select-none",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2"
      )}
    >
      <div
        className={cn(
          "lottery-status",
          "flex w-full shrink-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5",
          "font-mono text-[0.75rem] tracking-[0.04em]"
        )}
      >
        <Text className={cn("lottery-claimed", "whitespace-nowrap text-cs-muted")} size="xs">
          <span className={cn("lottery-claimed-count", "text-cs-accent tabular-nums")}>{shownClaimed}</span>
          /{polygonCount || 0} claimed
          <span className={cn("lottery-lose")}>
            {" · "}
            <span className={cn("lottery-lose-count", "text-cs-accent-2 tabular-nums")}>{shownLose}</span>
            /{loseCount || 0} house
          </span>
        </Text>
        <Text className={cn("lottery-bankroll", "whitespace-nowrap", bankrollClass(bankroll, ticketPrice))} size="xs">
          {ethLabel(bankroll, symbol)}
        </Text>
      </div>
      <Card
        className={cn(
          "lottery-map-card",
          revealing && "lottery-map-card-spinning",
          "flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        )}
        padding={0}
      >
        <div className={cn("lottery-map-frame", "relative flex min-h-0 w-full flex-1 flex-col items-center justify-center p-1.5")}>
          <div className={cn("lottery-map-stack", "flex min-h-0 max-h-full w-full flex-1 flex-col items-center gap-1")}>
            <div className={cn("lottery-map-wrap", "flex min-h-0 w-full flex-1 items-center justify-center")}>
            <LotteryMap
              address={address}
              owners={mapOwners}
              mates={mapMates}
              polygonCount={polygonCount}
              loseCount={loseCount}
              account={account}
              flashIds={flashIds}
              litIds={showClaim ? [] : litIds}
              splitIds={isSplit && !hideResult && !showClaim ? splitIds : []}
              spinning={revealing}
              celebrate={showBanner && playersWon}
            />
            </div>
            <div className={cn("lottery-prize", "flex h-[1.25rem] shrink-0 items-center justify-center")}>
              <span className={cn("lottery-prize-value", "font-headings text-[1rem] font-extrabold leading-none tabular-nums text-cs-accent")}>
                {ethLabel(pot, symbol)}
              </span>
            </div>
          </div>
          {showClaim &&
            <div className={cn("lottery-claim-wrap", "absolute inset-0 z-10 flex items-center justify-center bg-cs-bg")}>
              <Button
                className={cn("lottery-claim", "animate-claim min-w-36")}
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
        {account && !authorized &&
          <Button className={cn("lottery-deposit", "flex-1")} onClick={() => showModal(SessionModal)}>
            Deposit
          </Button>
        }
        {authorized && !pending &&
          <button
            type="button"
            className={cn(
              "lottery-spin",
              "group relative inline-flex min-h-8 min-w-0 flex-1 appearance-none items-center justify-center overflow-hidden",
              "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
              "leading-normal tracking-[0.06em] uppercase text-cs-text",
              "cursor-pointer touch-manipulation touch-none select-none [-webkit-touch-callout:none]",
              "enabled:hover:border-cs-border-hover enabled:hover:text-cs-accent",
              "disabled:cursor-default",
              !revealing && "disabled:opacity-40",
              "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg",
              "data-[spinning=true]:border-cs-accent data-[spinning=true]:text-cs-bg"
            )}
            data-holding={holdingSpin}
            data-spinning={revealing}
            disabled={!canSpin && !holdingSpin && !revealing}
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
                "group-data-[holding=true]:ease-linear",
                "group-data-[spinning=true]:w-full group-data-[spinning=true]:duration-200"
              )}
            />
            <span className={cn("lottery-spin-label", "relative z-[1]")}>{spinLabel}</span>
          </button>
        }
      </div>
      {createPortal(
        showBanner && !revealing && bannerLabel &&
          <div className={cn(
            "lottery-banner",
            "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          )}>
            <div className={cn("lottery-banner-dim", "absolute inset-0 bg-cs-bg/72")} />
            <Card
              className={cn(
                "lottery-banner-card",
                houseWon && "lottery-banner-house",
                "relative z-[1] flex min-w-36 flex-col items-center gap-1 rounded-[0.75rem] px-6 py-4 text-center",
                cardAnim,
                playersWon && "border-transparent bg-cs-accent text-cs-bg",
                houseWon && "border-transparent bg-cs-accent-2 text-white"
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


const flashAll = (address, count, winCount, setLitIds, setLanded, stopFlash, { getWinner, getCruiseDelay }) => {
  return new Promise((resolve) => {
    if (!count) {
      resolve()
      return
    }
    const polygons = buildPolygons(seedFromAddress(address), count, winCount)
    const wheel = _.map(_.sortBy(polygons, (cell) => Math.atan2(cell.y - 0.5, cell.x - 0.5)), "id")
    const from = wheel[_.random(0, count - 1)]
    const publish = (id) => {
      setLanded(false)
      setLitIds((prev) => {
        if (prev[0] === id) return prev
        return _.take([id, ...prev], TRAIL)
      })
    }
    const finish = (winner) => {
      setLitIds([winner])
      setLanded(true)
      _.delay(resolve, HOLD_MS)
    }
    const stop = runPolygonFlash({
      from,
      wheel,
      getWinner,
      getCruiseDelay,
      onTick: publish,
      onDone: finish
    })
    stopFlash.current = () => {
      stop()
      resolve()
    }
  })
}

const runPolygonFlash = ({ from, wheel, getWinner, getCruiseDelay, onTick, onDone }) => {
  let timer
  let stopped = false
  let steps = 0
  let endStep
  let landSpan
  const n = wheel.length
  let startIndex = _.indexOf(wheel, from)
  if (startIndex < 0) startIndex = 0
  let index = startIndex
  let delay = getCruiseDelay()

  onTick(wheel[index], delay)

  const tick = () => {
    if (stopped) return
    index = (index + 1) % n
    steps += 1

    const winner = getWinner()
    delay = getCruiseDelay()
    if (_.isNumber(winner)) {
      const winnerIndex = _.indexOf(wheel, winner)
      if (!_.isNumber(endStep)) {
        let distance = (winnerIndex - index + n) % n
        if (distance < 1) distance = n
        endStep = steps + distance
        landSpan = distance
      }
      if (steps >= endStep && index === winnerIndex) {
        onTick(wheel[index], delay)
        onDone(winner)
        return
      }
      let remaining = endStep - steps
      if (remaining < 0) remaining = 0
      const slowSteps = _.min([SLOW_STEPS, landSpan])
      if (remaining <= slowSteps) {
        const t = 1 - remaining / slowSteps
        delay = SPIN_MS + t * t * t * SLOW_EXTRA
      }
    }

    onTick(wheel[index], delay)
    timer = _.delay(tick, delay)
  }

  timer = _.delay(tick, delay)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
