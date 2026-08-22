import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, fetchLottery, BONUS_NOVA, BONUS_NUCLEUS, BONUS_SPARK, bonusPayout, jackpotByPlayer, jackpotQuote, selectLottery, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
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

const SPIN_MS = 28
const WIND_MS = 200
const SLOW_STEPS = 10
const SLOW_EXTRA = 280
const HOLD_MS = 220
const HOLD_FILL_MS = 1000
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
  const pendingWinner = React.useRef()
  const spinDone = React.useRef()
  const holdStart = React.useRef()
  const committed = React.useRef(false)
  const { account, session, balance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize,
    owners = [], mates = [], bonuses = [], lastTicket, totalBalance
  } = lottery
  const { settled, playersWin, roundPrize, splitIds = [], bonusIds = [], roundMates, roundBonuses, bonus: ticketBonus } = lastTicket || {}
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
  const mineJackpot = myJackpot > 0
  const hasJackpot = tableJackpot > 0
  const canSpin = authorized && clampEth(balance) >= totalPrice && !buying && roundOpen && !showBanner && !pending && !revealing
  const isSplit = splitIds.length > 0 && !settled
  const isBonus = bonusIds.length > 0 && !settled
  const bonusKind = Number(ticketBonus) || 0
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
    bannerLabel = "Nucleus"
    bannerHero = ethLabel(bonusPayout(BONUS_NUCLEUS, totalPrice, polygonCount, loseCount), symbol)
    if (bonusKind === BONUS_SPARK) {
      bannerLabel = "Spark"
      bannerHero = ethLabel(bonusPayout(BONUS_SPARK, totalPrice, polygonCount, loseCount), symbol)
    }
    if (bonusKind === BONUS_NOVA) {
      bannerLabel = "Nova"
      bannerHero = ethLabel(bonusPayout(BONUS_NOVA, totalPrice, polygonCount, loseCount), symbol)
    }
  }
  if (houseWon) bannerLabel = "House"
  if (playersWon) {
    bannerLabel = "Players"
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (playersWon || isBonus) heroClass = "text-[1.75rem]"
  if (bonusKind === BONUS_NOVA) heroClass = "text-[2.25rem]"
  let bannerAnim = "animate-banner"
  let cardAnim = "animate-banner-card"
  const longBanner = playersWon || bonusKind === BONUS_NUCLEUS || bonusKind === BONUS_NOVA
  if (longBanner) {
    bannerAnim = "animate-banner-long"
    cardAnim = "animate-banner-card-long"
  }
  let mapMates = mates
  let mapBonuses = bonuses
  if (pending && roundMates && roundMates.length) mapMates = roundMates
  if (pending && roundBonuses && roundBonuses.length) mapBonuses = roundBonuses
  const boardKinds = _.uniq(_.filter(_.take(mapBonuses, polygonCount || 0), (kind) => kind > 0))
  let jackpotLabel = "jackpot"
  if (boardKinds.length === 1 && boardKinds[0] === BONUS_SPARK) jackpotLabel = "spark"
  if (boardKinds.length === 1 && boardKinds[0] === BONUS_NUCLEUS) jackpotLabel = "nucleus"
  if (boardKinds.length === 1 && boardKinds[0] === BONUS_NOVA) jackpotLabel = "nova"
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
    fetchBalance()
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
    if (playersWon || bonusKind === BONUS_NUCLEUS || bonusKind === BONUS_NOVA) wait = BANNER_LONG_MS
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
    unwatchLottery(address)
    let keepLit = false
    try {
      const ticket = await buyLotteryTicket(address)
      if (!ticket) return
      const draws = ticket.draws || []
      const winner = _.last(_.map(draws, "polygonId"))
      pendingWinner.current = winner
      const refresh = fetchLottery(address)
      if (_.isNumber(winner) && spinDone.current) await spinDone.current
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      spinDone.current = undefined
      const split = (ticket.splitIds || []).length > 0
      const bonusHit = (ticket.bonusIds || []).length > 0 && !ticket.settled
      const showResult = split || ticket.settled || (ticket.bonusIds || []).length
      await refresh
      fetchBalance()
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
      spinDone.current = undefined
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
      if (stopFlash.current) stopFlash.current()
      stopFlash.current = undefined
      spinDone.current = undefined
      committed.current = false
      setRevealing(false)
      setLitIds([])
      setLanded(false)
    }
    setHoldingSpin(false)
  }

  const startSpinHold = (event) => {
    if (!canSpin) return
    if (event.button > 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setHoldingSpin(true)
    setLanded(false)
    pendingWinner.current = undefined
    committed.current = false
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
            <span className={cn("lottery-lose-count", "text-cs-accent-2 tabular-nums")}>{loseLit || 0}</span>
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
          <div className={cn("lottery-map-stack", "flex max-h-full w-full flex-col items-center gap-1")}>
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
            <div className={cn("lottery-prize", "flex h-[2.25rem] shrink-0 flex-col items-center justify-start gap-0.5")}>
              <span className={cn("lottery-prize-value", "font-headings text-[1rem] font-extrabold leading-none tabular-nums text-cs-accent")}>
                {ethLabel(pot, symbol)}
              </span>
              {hasJackpot &&
                <span
                  key={tableJackpot}
                  className={cn(
                    "lottery-prize-jackpot",
                    "flex items-baseline gap-1 font-mono text-[0.75rem] leading-none tabular-nums",
                    mineJackpot && "text-cs-accent",
                    !mineJackpot && "text-cs-accent-2",
                    jackpotPulse && "animate-jackpot-in"
                  )}
                >
                  <span className={cn("lottery-prize-jackpot-label", "text-cs-muted")}>{jackpotLabel}</span>
                  <span className={cn("lottery-prize-jackpot-value")}>+{ethLabel(tableJackpot, symbol)}</span>
                </span>
              }
            </div>
          </div>
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
                isBonus && bonusKind === BONUS_SPARK && "lottery-banner-spark",
                isBonus && bonusKind === BONUS_NUCLEUS && "lottery-banner-jackpot",
                isBonus && bonusKind === BONUS_NOVA && "lottery-banner-nova",
                "flex min-w-36 flex-col items-center gap-1 rounded-[0.75rem] px-6 py-4 text-center",
                cardAnim,
                playersWon && "border-transparent bg-cs-accent text-cs-bg",
                houseWon && "border-transparent bg-cs-accent-2 text-white",
                isSplit && "border-transparent bg-cs-accent text-cs-bg",
                isBonus && bonusKind === BONUS_SPARK && "border-transparent bg-cs-accent-2 text-white",
                isBonus && bonusKind === BONUS_NUCLEUS && "border-cs-border bg-cs-elevated text-cs-accent",
                isBonus && bonusKind === BONUS_NOVA && "border-transparent bg-cs-accent text-cs-bg"
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
        const want = _.min([SLOW_STEPS + 4, n])
        if (distance > want) {
          index = (winnerIndex - want + n) % n
          distance = want
        }
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
