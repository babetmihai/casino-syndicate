import React from "react"
import _ from "lodash"
import { Card, Text } from "@mantine/core"
import { buyPolygonsTicket, fetchPolygons, selectPolygons, unwatchPolygons, watchPolygons, withdrawPolygonsPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { requirePlayWallet } from "app/core/auth/SessionModal"
import PolygonsMap from "../PolygonsMap"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { NUCLEUS_ID, NUCLEUS_WEIGHT } from "../polygons"
import { ethers } from "ethers"
import PolygonsRace from "./PolygonsRace"
import PolygonsPrize from "./PolygonsPrize"
import PolygonsClaim from "./PolygonsClaim"
import PolygonsControls from "./PolygonsControls"
import PolygonsToast from "./PolygonsToast"
import PolygonsBanner from "./PolygonsBanner"

const HOLD_MS = 160
const HOLD_FILL_MS = 1000
const CLEAR_MS = 500
const BANNER_MS = 2500
const BANNER_LONG_MS = 4500
const HOP_MS = 220
const EMPTY = []


const PolygonsGame = React.memo(({ address }) => {
  const [buying, setBuying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [litIds, setLitIds] = React.useState(EMPTY)
  const [landed, setLanded] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const [beat, setBeat] = React.useState("")
  const [multiplier, setMultiplier] = React.useState(1)
  const holdTimer = React.useRef()
  const boardSnap = React.useRef()
  const spinningRef = React.useRef(false)
  const seenHouseSettle = React.useRef()
  const landingRef = React.useRef()
  const holdingRef = React.useRef(false)
  const onLandRef = React.useRef()
  const ticketRef = React.useRef()
  holdingRef.current = holdingSpin
  const { account, session, balance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const polygons = useSelector(() => selectPolygons(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize,
    owners = [], mates = [], lastTicket, totalBalance, livePlayers = [], lastSettle
  } = polygons
  const { settled, playersWin, roundPrize, splitIds = [], roundMates, closer } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const showClaim = Boolean(account && hasPrize && !revealing && !showBanner)
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalPrice = clampEth(ticketPrice) * multiplier
  const bankroll = clampEth(totalBalance)
  const pot = clampEth(prize / 2)
  const canSpin = authorized && clampEth(balance) >= totalPrice && !buying && roundOpen && !showBanner && !pending && !revealing
  const isSplit = splitIds.length > 0 && !settled
  const houseFromWatch = lastSettle && !lastSettle.playersWin && account && _.includes(livePlayers, ethers.getAddress(account))
  const houseWon = (settled && !playersWin) || houseFromWatch
  const playersWon = settled && playersWin
  let flashIds = EMPTY
  if (landed) flashIds = litIds
  if (showClaim) flashIds = EMPTY
  let bannerLabel
  let bannerHero
  if (houseWon) bannerLabel = "House wins"
  if (playersWon) {
    bannerLabel = "Players"
    if (account && closer && ethers.getAddress(closer) === ethers.getAddress(account)) {
      bannerLabel = "You win"
    }
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let heroClass = "text-[3.5rem]"
  if (playersWon) heroClass = "text-[1.75rem]"
  let cardAnim = "animate-banner-card"
  if (playersWon) cardAnim = "animate-banner-card-long"
  const hideResult = holdingSpin || revealing
  const housePop = Boolean(showBanner && houseWon && !revealing)
  let mapOwners = owners
  let mapMates = mates
  if (pending && roundMates && roundMates.length) mapMates = roundMates
  if ((hideResult || housePop || landed) && boardSnap.current) {
    mapOwners = boardSnap.current.owners
    mapMates = boardSnap.current.mates
  }
  let shownCells = claimedCount || 0
  let shownLose = loseLit || 0
  if ((hideResult || housePop) && boardSnap.current) {
    shownCells = boardSnap.current.claimedCount || 0
    shownLose = boardSnap.current.loseLit || 0
  }
  const mineKey = account && ethers.getAddress(account)
  const playerShares = React.useMemo(() => {
    const rows = []
    _.forEach(_.take(mapOwners, polygonCount || 0), (owner, index) => {
      if (!owner) return
      const mate = mapMates[index]
      const addShare = (addr, amount) => {
        const key = ethers.getAddress(addr)
        const row = _.find(rows, { key })
        if (row) {
          row.amount += amount
          return
        }
        rows.push({ key, amount })
      }
      if (mate) {
        addShare(owner, 0.5)
        addShare(mate, 0.5)
        return
      }
      addShare(owner, 1)
    })
    return rows
  }, [mapOwners, mapMates, polygonCount])
  const racePlayers = React.useMemo(() => {
    return _.orderBy(playerShares, [
      (row) => {
        if (mineKey && row.key === mineKey) return 0
        return 1
      },
      "amount"
    ], ["asc", "desc"])
  }, [playerShares, mineKey])
  let housePct = 0
  if (loseCount) housePct = (shownLose / loseCount) * 100
  const lastGreen = shownCells > 0 && shownCells === (polygonCount || 0) - 1
  const lastHouse = shownLose > 0 && shownLose === (loseCount || 0) - 1
  let spinLabel = `Hold to spin · ${ethLabel(totalPrice, symbol)}`
  if (multiplier > 1) spinLabel = `Hold to spin · x${multiplier} · ${ethLabel(totalPrice, symbol)}`
  if (buying || revealing) {
    spinLabel = "Spinning"
    if (multiplier > 1) spinLabel = `Spinning · x${multiplier}`
  }
  if (!roundOpen) spinLabel = "Closed"

  React.useEffect(() => {
    if (holdingSpin || revealing || buying) {
      unwatchPolygons(address)
      return
    }
    fetchPolygons(address)
    watchPolygons(address)
    return () => unwatchPolygons(address)
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
      setLitIds(EMPTY)
      setLanded(false)
    }, wait)
    return () => clearTimeout(timer)
  }, [showBanner])

  React.useEffect(() => {
    if (!beat) return
    const timer = _.delay(() => setBeat(""), BANNER_MS)
    return () => clearTimeout(timer)
  }, [beat])

  React.useEffect(() => {
    if (revealing) return
    if (!landed) return
    if (showBanner) return
    const timer = _.delay(() => {
      setLitIds(EMPTY)
      setLanded(false)
    }, CLEAR_MS)
    return () => clearTimeout(timer)
  }, [revealing, landed, showBanner])

  const onClaim = async () => {
    if (!hasPrize || claiming) return
    if (!requirePlayWallet()) return
    setClaiming(true)
    try {
      await withdrawPolygonsPrize(address)
      fetchBalance()
    } finally {
      setClaiming(false)
    }
  }

  const finishSpin = async (ids) => {
    const ticket = ticketRef.current
    if (!ticket) {
      setRevealing(false)
      setBuying(false)
      spinningRef.current = false
      return
    }
    const draws = ticket.draws || []
    const bounced = _.filter(draws, "bounce")
    let nextIds = ids
    if (!nextIds || !nextIds.length) {
      nextIds = _.map(draws, (draw) => {
        if (draw.bounce) return draw.fromId
        return draw.polygonId
      })
    }
    setLanded(true)
    setLitIds(nextIds)
    if (bounced.length) {
      await new Promise((resolve) => _.delay(resolve, HOP_MS))
      setLitIds(_.map(draws, "polygonId"))
    }
    fetchPolygons(address)
    fetchBalance()
    await new Promise((resolve) => _.delay(resolve, 0))
    setRevealing(false)
    setBuying(false)
    spinningRef.current = false
    if (ticket.settled) setShowBanner(true)
    if (!ticket.settled) {
      const nucleusHit = _.some(draws, (draw) => {
        return draw.assigned && draw.won && draw.polygonId === NUCLEUS_ID
      })
      if (nucleusHit) setBeat("Nucleus")
    }
  }
  onLandRef.current = finishSpin

  const onBuy = async () => {
    setBuying(true)
    setRevealing(true)
    setLitIds(EMPTY)
    setLanded(false)
    try {
      const ticket = await buyPolygonsTicket(address, multiplier)
      if (!ticket) {
        setRevealing(false)
        setBuying(false)
        spinningRef.current = false
        landingRef.current = undefined
        return
      }
      ticketRef.current = ticket
      landingRef.current = _.map(ticket.draws || [], (draw) => {
        if (draw.bounce) return draw.fromId
        return draw.polygonId
      })
    } catch {
      setRevealing(false)
      setBuying(false)
      spinningRef.current = false
      landingRef.current = undefined
      setLitIds(EMPTY)
      setLanded(false)
    }
  }

  const cancelSpinHold = () => {
    if (!holdTimer.current) {
      setHoldingSpin(false)
      return
    }
    clearTimeout(holdTimer.current)
    holdTimer.current = null
    spinningRef.current = false
    boardSnap.current = undefined
    landingRef.current = undefined
    ticketRef.current = undefined
    setHoldingSpin(false)
    setRevealing(false)
    setLitIds(EMPTY)
    setLanded(false)
    setBeat("")
  }

  const startSpinHold = (event) => {
    if (!canSpin) return
    if (event.button > 0) return
    if (holdTimer.current || spinningRef.current) return
    spinningRef.current = true
    landingRef.current = undefined
    ticketRef.current = undefined
    unwatchPolygons(address)
    setHoldingSpin(true)
    setLanded(false)
    setBeat("")
    boardSnap.current = {
      owners,
      mates,
      claimedCount,
      loseLit
    }
    holdTimer.current = _.delay(() => {
      holdTimer.current = null
      setHoldingSpin(false)
      onBuy()
    }, HOLD_FILL_MS)
  }

  return (
    <div
      className={cn(
        "polygons-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2 select-none",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2"
      )}
    >
      <div
        className={cn(
          "polygons-status",
          "flex w-full shrink-0 items-center justify-between gap-2",
          "font-mono text-[0.75rem] tracking-[0.04em]"
        )}
      >
        <PolygonsRace
          players={racePlayers}
          mineKey={mineKey}
          polygonCount={polygonCount}
          lastGreen={lastGreen}
          lastHouse={lastHouse}
          housePct={housePct}
        />
        <Text className={cn("polygons-bankroll", "shrink-0 whitespace-nowrap", bankrollClass(bankroll, ticketPrice))} size="xs">
          {ethLabel(bankroll, symbol)}
        </Text>
      </div>
      <Card
        className={cn(
          "polygons-map-card",
          (holdingSpin || revealing) && "polygons-map-card-spinning",
          "flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        )}
        padding={0}
      >
        <div className={cn("polygons-map-frame", "relative flex min-h-0 w-full flex-1 flex-col items-center justify-center p-1.5")}>
          <div className={cn("polygons-map-stack", "flex min-h-0 w-full flex-1 flex-col items-center justify-center")}>
            <PolygonsMap
              address={address}
              owners={mapOwners}
              mates={mapMates}
              polygonCount={polygonCount}
              loseCount={loseCount}
              account={account}
              flashIds={flashIds}
              litIds={showClaim ? EMPTY : litIds}
              splitIds={isSplit && !hideResult && !showClaim ? splitIds : EMPTY}
              spinning={holdingSpin || revealing || landed}
              holdingRef={holdingRef}
              landingRef={landingRef}
              onLandRef={onLandRef}
              manyLit={multiplier > 1}
              celebrate={showBanner && playersWon}
              housePop={housePop}
            />
            <PolygonsPrize label={ethLabel(pot, symbol)} />
          </div>
          <PolygonsClaim
            show={showClaim}
            claiming={claiming}
            label={ethLabel(myPrize, symbol)}
            onClaim={onClaim}
          />
        </div>
      </Card>
      <PolygonsControls
        account={account}
        authorized={authorized}
        pending={pending}
        multiplier={multiplier}
        buying={buying}
        revealing={revealing}
        holdingSpin={holdingSpin}
        canSpin={canSpin}
        spinLabel={spinLabel}
        onMultiplier={setMultiplier}
        onSpinDown={startSpinHold}
        onSpinUp={cancelSpinHold}
      />
      <PolygonsToast beat={beat} revealing={revealing} hero={`x${NUCLEUS_WEIGHT}`} />
      <PolygonsBanner
        show={showBanner}
        revealing={revealing}
        playersWon={playersWon}
        label={bannerLabel}
        hero={bannerHero}
        cardAnim={cardAnim}
        heroClass={heroClass}
      />
    </div>
  )
})

export default PolygonsGame
