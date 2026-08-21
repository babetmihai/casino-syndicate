import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, fetchLottery, jackpotByPlayer, jackpotQuote, selectLottery, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import LotteryMap from "../LotteryMap"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { buildPolygons, seedFromAddress } from "../polygons"
import { ethers } from "ethers"

const FAST_MS = 32
const SLOW_MS = 220
const SLOW_STEPS = 14
const HOLD_MS = 560
const CLEAR_MS = 280
const NUCLEUS_MS = 780
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
  const [freshBonusIds, setFreshBonusIds] = React.useState([])
  const [jackpotPulse, setJackpotPulse] = React.useState(false)
  const stopFlash = React.useRef()
  const holdTimer = React.useRef()
  const bannerTimer = React.useRef()
  const knownBonuses = React.useRef()
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize,
    owners = [], mates = [], bonuses = [], lastTicket, totalBalance
  } = lottery
  const { settled, playersWin, roundPrize, splitIds = [], bonusIds = [], roundMates, roundBonuses } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalCells = (polygonCount || 0) + (loseCount || 0)
  const totalPrice = clampEth(ticketPrice)
  const bankroll = clampEth(totalBalance)
  const tableJackpot = jackpotQuote(lottery)
  const pot = clampEth(prize) - tableJackpot
  const jackpots = jackpotByPlayer(lottery) || {}
  let myJackpot
  if (account) myJackpot = jackpots[ethers.getAddress(account)]
  const canSpin = account && !buying && roundOpen && !showBanner && !pending && !revealing
  const isSplit = splitIds.length > 0 && !settled
  const isBonus = bonusIds.length > 0 && !settled
  const houseWon = settled && !playersWin
  const playersWon = settled && playersWin
  let flashIds = []
  if (landed) flashIds = _.take(litIds, 1)
  if (jackpotPulse) flashIds = freshBonusIds
  if (showBanner && isBonus) flashIds = bonusIds
  let bannerLabel
  let bannerHero
  if (isSplit) bannerLabel = "Split"
  if (isBonus) {
    bannerLabel = "Jackpot"
    bannerHero = ethLabel(totalPrice * ((polygonCount || 0) + (loseCount || 0)), symbol)
  }
  if (houseWon) bannerLabel = "House"
  if (playersWon) {
    bannerLabel = "Players"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (playersWon || isBonus) heroClass = "text-[1.75rem]"
  let bannerAnim = "animate-banner"
  let cardAnim = "animate-banner-card"
  if (playersWon || isBonus) {
    bannerAnim = "animate-banner-long"
    cardAnim = "animate-banner-card-long"
  }
  let mapMates = mates
  let mapBonuses = bonuses
  if (pending && roundMates && roundMates.length) mapMates = roundMates
  if (pending && roundBonuses && roundBonuses.length) mapBonuses = roundBonuses
  const mineCount = _.filter(_.take(owners, polygonCount || 0), (owner) => {
    return owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  }).length + _.filter(mapMates, (mate) => {
    return mate && account && ethers.getAddress(mate) === ethers.getAddress(account)
  }).length
  let shownClaimed = claimedCount || 0
  if (account) shownClaimed = mineCount
  let spinLabel = `Hold to spin · ${ethLabel(totalPrice, symbol)}`
  if (buying || revealing) spinLabel = "Spinning"
  if (!roundOpen) spinLabel = "Closed"

  React.useEffect(() => {
    fetchLottery(address)
    watchLottery(address)
    knownBonuses.current = undefined
    setFreshBonusIds([])
    setJackpotPulse(false)
    return () => unwatchLottery(address)
  }, [address, account])

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  React.useEffect(() => {
    if (!polygonCount) return
    const ids = []
    _.forEach(mapBonuses, (on, index) => {
      if (on) ids.push(index)
    })
    if (!_.isArray(knownBonuses.current)) {
      knownBonuses.current = ids
      return
    }
    const added = _.difference(ids, knownBonuses.current)
    knownBonuses.current = ids
    if (!added.length) return
    setFreshBonusIds(added)
    setJackpotPulse(true)
  }, [mapBonuses, polygonCount])

  React.useEffect(() => {
    if (!jackpotPulse) return
    const timer = _.delay(() => setJackpotPulse(false), 900)
    return () => clearTimeout(timer)
  }, [jackpotPulse])

  React.useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current)
    }
  }, [])

  React.useEffect(() => {
    if (!showBanner) return
    let wait = BANNER_MS
    if (playersWon || isBonus) wait = BANNER_LONG_MS
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
    if (isBonus) return
    const timer = _.delay(() => {
      setLitIds([])
      setLanded(false)
    }, CLEAR_MS)
    return () => clearTimeout(timer)
  }, [revealing, landed, showBanner])

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
    setRevealing(true)
    setLanded(false)
    unwatchLottery(address)
    let winner
    let keepLit = false
    const spinning = flashAll(address, totalCells, polygonCount || 0, setLitIds, setLanded, stopFlash, () => winner)
    try {
      const ticket = await buyLotteryTicket(address)
      if (!ticket) return
      const draws = ticket.draws || []
      winner = _.last(_.map(draws, "polygonId"))
      if (_.isNumber(winner)) await spinning
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      const split = (ticket.splitIds || []).length > 0
      const bonusHit = (ticket.bonusIds || []).length > 0 && !ticket.settled
      const showResult = split || ticket.settled || (ticket.bonusIds || []).length
      await fetchLottery(address)
      if (account) fetchBalance(account)
      keepLit = true
      setBuying(false)
      setRevealing(false)
      if (bonusHit) {
        bannerTimer.current = _.delay(() => {
          bannerTimer.current = null
          setShowBanner(true)
        }, NUCLEUS_MS)
      } else if (showResult) {
        setShowBanner(true)
      }
    } finally {
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      setRevealing(false)
      setBuying(false)
      if (!keepLit) {
        setLitIds([])
        setLanded(false)
      }
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
            <span className={cn("lottery-lose-count", "text-cs-accent-2 tabular-nums")}>{loseLit || 0}</span>
            /{loseCount || 0} house
          </span>
        </Text>
        <span className={cn("lottery-prize", "whitespace-nowrap")}>
          <span className={cn("lottery-prize-value", "font-headings text-[1.125rem] font-extrabold leading-none tabular-nums text-cs-accent")}>
            {ethLabel(pot, symbol)}
          </span>
          {myJackpot > 0 &&
            <span
              key={myJackpot}
              className={cn("lottery-prize-jackpot", "ml-1 inline-block text-[0.75rem] font-normal text-cs-accent-2 animate-jackpot-in")}
            >
              +{ethLabel(myJackpot, symbol)}
            </span>
          }
        </span>
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
        <div className={cn("lottery-map-frame", "relative flex min-h-0 w-full flex-1 p-1.5")}>
          <LotteryMap
            address={address}
            owners={owners}
            mates={mapMates}
            bonuses={mapBonuses}
            polygonCount={polygonCount}
            loseCount={loseCount}
            account={account}
            flashIds={flashIds}
            litIds={litIds}
            splitIds={isSplit ? splitIds : []}
            freshBonusIds={freshBonusIds}
            spinning={revealing}
            celebrate={pending && !revealing && playersWin !== false}
          />
          {account && hasPrize && !revealing &&
            <div className={cn("lottery-claim-wrap", "absolute inset-0 z-10 flex items-center justify-center bg-cs-bg/60 animate-overlay-in")}>
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
        {account && !pending &&
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
            "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72",
            bannerAnim
          )}>
            <Card
              className={cn(
                "lottery-banner-card",
                houseWon && "lottery-banner-house",
                isSplit && "lottery-banner-split",
                isBonus && "lottery-banner-jackpot",
                "flex min-w-36 flex-col items-center gap-1 rounded-[0.75rem] px-6 py-4 text-center",
                cardAnim,
                playersWon && "border-transparent bg-cs-accent text-cs-bg",
                houseWon && "border-transparent bg-cs-accent-2 text-white",
                isSplit && "border-transparent bg-cs-accent text-cs-bg",
                isBonus && "border-cs-border bg-cs-elevated text-cs-accent"
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


const flashAll = (address, count, winCount, setLitIds, setLanded, stopFlash, getWinner) => {
  return new Promise((resolve) => {
    if (!count) {
      resolve()
      return
    }
    const polygons = buildPolygons(seedFromAddress(address), count, winCount)
    const wheel = _.map(_.sortBy(polygons, (cell) => Math.atan2(cell.y - 0.5, cell.x - 0.5)), "id")
    let position = wheel[_.random(0, count - 1)]
    const publish = (id) => {
      position = id
      setLanded(false)
      setLitIds((prev) => {
        if (prev[0] === id) return prev
        return _.take([id, ...prev], TRAIL)
      })
    }
    const stop = runPolygonFlash({
      from: position,
      wheel,
      getWinner,
      onTick: publish,
      onDone: (winner) => {
        setLitIds([winner])
        setLanded(true)
        _.delay(resolve, HOLD_MS)
      }
    })
    stopFlash.current = stop
  })
}

const runPolygonFlash = ({ from, wheel, getWinner, onTick, onDone }) => {
  let raf
  let stopped = false
  let steps = 0
  let endStep
  let landSpan
  const n = wheel.length
  let startIndex = _.indexOf(wheel, from)
  if (startIndex < 0) startIndex = 0
  let index = startIndex
  let delay = FAST_MS
  let lastAt = 0
  onTick(wheel[index])

  const frame = (now) => {
    if (stopped) return
    if (!lastAt) {
      lastAt = now
      raf = requestAnimationFrame(frame)
      return
    }
    if (now - lastAt < delay) {
      raf = requestAnimationFrame(frame)
      return
    }
    lastAt = now
    index = (index + 1) % n
    steps += 1

    const winner = getWinner()
    delay = FAST_MS + _.random(-5, 6)
    if (_.isNumber(winner)) {
      const winnerIndex = _.indexOf(wheel, winner)
      if (!_.isNumber(endStep)) {
        const distance = (winnerIndex - index + n) % n
        let more = distance
        if (more < 1) more = n
        while (more < SLOW_STEPS + 4) more += n
        endStep = steps + more
        landSpan = more
      }
      if (steps >= endStep && index === winnerIndex) {
        onTick(wheel[index])
        onDone(winner)
        return
      }
      let remaining = endStep - steps
      if (remaining < 0) remaining = 0
      const slowSteps = Math.min(SLOW_STEPS, landSpan)
      if (remaining <= slowSteps) {
        const t = 1 - remaining / slowSteps
        delay = FAST_MS + t * t * t * (SLOW_MS - FAST_MS)
      } else {
        delay = FAST_MS
      }
    }

    onTick(wheel[index])
    raf = requestAnimationFrame(frame)
  }

  raf = requestAnimationFrame(frame)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
  }
}
