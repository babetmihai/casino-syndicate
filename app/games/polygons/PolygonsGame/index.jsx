import React from "react"
import _ from "lodash"
import { Card, Text } from "@mantine/core"
import { fetchPolygons, packedTickets, selectPolygons, TICKET_MULTIPLIERS, unwatchPolygons, watchPolygons } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { cn, EMPTY_OBJECT } from "app/core"
import PolygonsMap from "../PolygonsMap"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
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
  ackMapPrompt,
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
    owners = {}, lastTicket, totalBalance, livePlayers = {}, lastSettle,
    buying, claiming, revealing, litIds = {}, landed, showBanner, holdingSpin, beat, multiplier = 1,
    revealedOwners = {}, awaitNewGame, holdBoard
  } = polygons
  const { settled, playersWin, roundPrize, closer, refunded } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const showClaim = Boolean(account && hasPrize && !revealing && !showBanner)
  const showNewGame = Boolean(account && awaitNewGame && !revealing && !showClaim && !showBanner && !beat)
  const pending = hasPrize || awaitNewGame
  const showPrompt = showClaim || showNewGame
  let promptLabel = "New game"
  if (showClaim) promptLabel = `Claim ${ethLabel(myPrize, symbol)}`
  const pack = packedTickets(multiplier)
  const totalPrice = clampEth(ticketPrice) * pack
  const bankroll = clampEth(totalBalance)
  const pot = clampEth(prize)
  const canSpin = canSpinPolygons(address)
  const mineKey = account && ethers.getAddress(account)
  const houseFromWatch = lastSettle && !lastSettle.playersWin && mineKey && livePlayers[mineKey]
  const houseWon = (settled && !playersWin) || houseFromWatch
  const playersWon = settled && playersWin
  const hideResult = holdingSpin || revealing
  let flashIds = EMPTY_OBJECT
  if (hideResult || landed) {
    if (landed) flashIds = litIds
    if (!_.isEmpty(revealedOwners)) {
      flashIds = { ...flashIds, ...revealedOwners }
    }
  }
  if (showPrompt) flashIds = EMPTY_OBJECT
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
  const spin = spinOf(address)
  let mapOwners = owners
  let shownCells = claimedCount || 0
  let shownLose = loseLit || 0
  let shownPot = pot
  if ((hideResult || landed) && spin.boardSnap) {
    mapOwners = { ...spin.boardSnap.owners, ...revealedOwners }
    shownCells = spin.boardSnap.claimedCount || 0
    shownLose = spin.boardSnap.loseLit || 0
  }
  if ((awaitNewGame || hasPrize || holdBoard) && spin.resultSnap) {
    mapOwners = spin.resultSnap.owners
    shownCells = spin.resultSnap.claimedCount || 0
    shownLose = spin.resultSnap.loseLit || 0
    shownPot = clampEth(spin.resultSnap.prize)
  }
  const racePlayers = React.useMemo(() => {
    const rows = {}
    _.forEach(mapOwners, ({ id, address: owner }) => {
      if (id >= (polygonCount || 0)) return
      if (!owner) return
      const key = ethers.getAddress(owner)
      const row = rows[key]
      if (row) {
        row.amount += 1
        return
      }
      rows[key] = { id: key, amount: 1 }
    })
    return rows
  }, [mapOwners, polygonCount])
  let housePct = 0
  if (loseCount) housePct = (shownLose / loseCount) * 100
  const lastGreen = shownCells > 0 && shownCells === (polygonCount || 0) - 1
  const lastHouse = shownLose > 0 && shownLose === (loseCount || 0) - 1
  let spinLabel = `Hold to spin · ${ethLabel(totalPrice, symbol)}`
  if (pack > 1) spinLabel = `Hold to spin · x${pack} · ${ethLabel(totalPrice, symbol)}`
  if (buying || revealing) {
    spinLabel = "Spinning"
    if (pack > 1) spinLabel = `Spinning · x${pack}`
  }

  React.useEffect(() => {
    if (holdingSpin || revealing || buying || awaitNewGame || hasPrize) {
      unwatchPolygons(address)
      return
    }
    fetchPolygons(address)
    watchPolygons(address)
    return () => unwatchPolygons(address)
  }, [address, account, holdingSpin, revealing, buying, awaitNewGame, hasPrize])

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
              polygonCount={polygonCount}
              loseCount={loseCount}
              account={account}
              flashIds={flashIds}
              litIds={showPrompt ? EMPTY_OBJECT : litIds}
              spinning={holdingSpin || revealing}
              manyLit={pack > 1}
              celebrate={showBanner && playersWon}
            />
            <PolygonsPrize label={ethLabel(shownPot, symbol)} />
          </div>
          <PolygonsClaim
            show={showPrompt}
            loading={claiming}
            label={promptLabel}
            onClick={() => ackMapPrompt(address)}
          />
        </div>
      </Card>
      <PolygonsControls
        address={address}
        account={account}
        authorized={authorized}
        pending={pending}
        multiplier={pack}
        multipliers={TICKET_MULTIPLIERS}
        buying={buying}
        revealing={revealing}
        holdingSpin={holdingSpin}
        canSpin={canSpin}
        spinLabel={spinLabel}
        onMultiplier={(value) => setMultiplier(address, value)}
        onSpinDown={(event) => startSpinHold(address, event)}
        onSpinUp={() => cancelSpinHold(address)}
      />
      <PolygonsToast
        beat={beat}
        revealing={revealing}
        house={beat === "House wins"}
      />
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
