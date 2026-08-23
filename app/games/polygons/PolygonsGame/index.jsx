import React from "react"
import _ from "lodash"
import { Card, Text } from "@mantine/core"
import { fetchPolygons, selectPolygons, unwatchPolygons, watchPolygons } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { cn, EMPTY_OBJECT } from "app/core"
import PolygonsMap from "../PolygonsMap"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { nucleusWeight } from "../polygons"
import { ethers } from "ethers"
import PolygonsRace from "./PolygonsRace"
import PolygonsPrize from "./PolygonsPrize"
import PolygonsClaim from "./PolygonsClaim"
import PolygonsControls from "./PolygonsControls"
import PolygonsToast from "./PolygonsToast"
import PolygonsBanner from "./PolygonsBanner"
import {
  canSpinPolygons,
  cancelSpinHold,
  claimPrize,
  noteHouseSettle,
  setMultiplier,
  spinOf,
  startSpinHold,
  unmountPolygonsGame
} from "./actions"


const PolygonsGame = React.memo(({ address }) => {
  const { account, session } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const polygons = useSelector(() => selectPolygons(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const {
    polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, myPrize,
    owners = {}, mates = {}, lastTicket, totalBalance, livePlayers = {}, lastSettle,
    buying, claiming, revealing, litIds = {}, landed, showBanner, holdingSpin, beat, multiplier = 1,
    revealedOwners = {}, revealedMates = {}
  } = polygons
  const { settled, playersWin, roundPrize, splitIds = {}, roundMates, closer, refunded } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const showClaim = Boolean(account && hasPrize && !revealing && !showBanner)
  const roundOpen = (claimedCount || 0) < (polygonCount || 0) && (loseLit || 0) < (loseCount || 0)
  const totalPrice = clampEth(ticketPrice) * multiplier
  const bankroll = clampEth(totalBalance)
  const pot = clampEth(prize / 2)
  const canSpin = canSpinPolygons(address)
  const isSplit = !_.isEmpty(splitIds) && !settled
  const mineKey = account && ethers.getAddress(account)
  const houseFromWatch = lastSettle && !lastSettle.playersWin && mineKey && livePlayers[mineKey]
  const houseWon = (settled && !playersWin) || houseFromWatch
  const playersWon = settled && playersWin
  const hideResult = holdingSpin || revealing
  let flashIds = EMPTY_OBJECT
  if (hideResult || landed) {
    if (landed) flashIds = litIds
    if (!_.isEmpty(revealedOwners) || !_.isEmpty(revealedMates)) {
      flashIds = { ...flashIds, ...revealedOwners, ...revealedMates }
    }
  }
  if (showClaim) flashIds = EMPTY_OBJECT
  let bannerLabel
  let bannerHero
  if (houseWon) bannerLabel = "House wins"
  if (playersWon) {
    bannerLabel = "Players"
    if (mineKey && closer && ethers.getAddress(closer) === mineKey) {
      bannerLabel = "You win"
    }
    bannerHero = ethLabel(roundPrize, symbol)
  }
  let refundLabel
  if (clampEth(refunded) > 0) refundLabel = `Refunded ${ethLabel(refunded, symbol)}`
  let heroClass = "text-[3.5rem]"
  if (playersWon) heroClass = "text-[1.75rem]"
  let cardAnim = "animate-banner-card"
  if (playersWon) cardAnim = "animate-banner-card-long"
  let mapSplit = EMPTY_OBJECT
  if (hideResult || showClaim) mapSplit = revealedMates
  if (!hideResult && !showClaim && isSplit) mapSplit = splitIds
  const housePop = Boolean(showBanner && houseWon && !revealing)
  const spin = spinOf(address)
  let mapOwners = owners
  let mapMates = mates
  if (pending && !_.isEmpty(roundMates) && (hideResult || housePop || landed || showClaim)) {
    mapMates = roundMates
  }
  if ((hideResult || housePop || landed) && spin.boardSnap) {
    mapOwners = { ...spin.boardSnap.owners, ...revealedOwners }
    mapMates = { ...spin.boardSnap.mates, ...revealedMates }
  }
  let shownCells = claimedCount || 0
  let shownLose = loseLit || 0
  if ((hideResult || housePop) && spin.boardSnap) {
    shownCells = spin.boardSnap.claimedCount || 0
    shownLose = spin.boardSnap.loseLit || 0
  }
  const racePlayers = React.useMemo(() => {
    const rows = {}
    _.forEach(mapOwners, ({ id, address: owner }) => {
      if (id >= (polygonCount || 0)) return
      if (!owner) return
      const { address: mate } = mapMates[id] || {}
      const addShare = (addr, amount) => {
        const key = ethers.getAddress(addr)
        const row = rows[key]
        if (row) {
          row.amount += amount
          return
        }
        rows[key] = { id: key, amount }
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
    if (!houseFromWatch) return
    noteHouseSettle(address, lastSettle && lastSettle.id)
  }, [address, lastSettle, houseFromWatch])

  React.useEffect(() => {
    return () => unmountPolygonsGame(address)
  }, [address])

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
              litIds={showClaim ? EMPTY_OBJECT : litIds}
              splitIds={mapSplit}
              spinning={holdingSpin || revealing || landed}
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
            onClaim={() => claimPrize(address)}
          />
        </div>
      </Card>
      <PolygonsControls
        address={address}
        account={account}
        authorized={authorized}
        pending={pending}
        multiplier={multiplier}
        buying={buying}
        revealing={revealing}
        holdingSpin={holdingSpin}
        canSpin={canSpin}
        spinLabel={spinLabel}
        onMultiplier={(value) => setMultiplier(address, value)}
        onSpinDown={(event) => startSpinHold(address, event)}
        onSpinUp={() => cancelSpinHold(address)}
      />
      <PolygonsToast beat={beat} revealing={revealing} hero={`x${nucleusWeight(polygonCount)}`} />
      <PolygonsBanner
        show={showBanner}
        revealing={revealing}
        playersWon={playersWon}
        label={bannerLabel}
        hero={bannerHero}
        refund={refundLabel}
        cardAnim={cardAnim}
        heroClass={heroClass}
      />
    </div>
  )
})

export default PolygonsGame
