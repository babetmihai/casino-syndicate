import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, chanceLabel, fetchLottery, selectLottery, TICKET_MULTIPLIERS, unwatchLottery, watchLottery, withdrawLotteryPrize } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import LotteryMap from "../LotteryMap"
import { clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { ethers } from "ethers"


const LotteryGame = React.memo(({ address }) => {
  const [buying, setBuying] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [multiplier, setMultiplier] = React.useState(1)
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, winPercent, ticketPrice, claimedCount, prize, myPrize, owners = [], lastTicket } = lottery
  const { polygonId, assignedCount = 0, drawCount = 1, settled, roundPrize, refundAmount, takenIds = [] } = lastTicket || {}
  const hasPrize = clampEth(myPrize) > 0
  const pending = hasPrize
  const mineCount = _.filter(owners, (owner) => owner && account && ethers.getAddress(owner) === ethers.getAddress(account)).length
  const remaining = _.max([0, (polygonCount || 0) - (claimedCount || 0)])
  const canBuy = account && !buying && remaining > 0 && !showBanner && !pending
  const totalPrice = clampEth(ticketPrice) * multiplier
  const isWin = assignedCount > 0
  const isTaken = takenIds.length > 0 && assignedCount === 0
  let focusId
  if (showBanner && isWin && !settled) focusId = polygonId
  let flashIds = []
  if (showBanner) flashIds = takenIds
  let bannerTitle = "No reveal"
  let bannerCopy = "The ticket missed"
  if (drawCount > 1) bannerCopy = "The tickets missed"
  if (assignedCount === 1) {
    bannerTitle = "Polygon claimed"
    bannerCopy = `Sector ${polygonId + 1} is yours`
  }
  if (assignedCount > 1) {
    bannerTitle = "Polygons claimed"
    bannerCopy = `${assignedCount} sectors are yours`
  }
  if (isTaken) {
    bannerTitle = "Already claimed"
    bannerCopy = "Those sectors were taken"
  }
  if (settled) {
    bannerTitle = "Map complete"
    bannerCopy = `Prize ${ethLabel(roundPrize, symbol)} split`
    if (refundAmount) bannerCopy = `${bannerCopy} · refund ${ethLabel(refundAmount, symbol)}`
  }
  let buyLabel = "Buy"
  if (buying) buyLabel = "Drawing"

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
    if (!canBuy) return
    setBuying(true)
    try {
      const ticket = await buyLotteryTicket(address, multiplier)
      if (!ticket) {
        setBuying(false)
        return
      }
      if (!ticket.settled) setShowBanner(true)
      if (account) fetchBalance(account)
    } finally {
      setBuying(false)
    }
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
        <Text className={cn("lottery-chance", "shrink-0 whitespace-nowrap")} size="xs" c="dimmed">
          {chanceLabel(winPercent)}
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
            account={account}
            focusId={focusId}
            flashIds={flashIds}
            celebrate={pending}
          />
          {account && hasPrize &&
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
                  onClick={() => setMultiplier(value)}
                >
                  x{value}
                </button>
              )
            })}
          </div>
        }
        {account && !pending &&
          <Button
            className={cn("lottery-buy", "flex-1")}
            disabled={!canBuy}
            loading={buying}
            onClick={onBuy}
          >
            {buyLabel} · {ethLabel(totalPrice, symbol)}
          </Button>
        }
      </div>
      {createPortal(
        showBanner &&
          <div className={cn(
            "lottery-banner",
            "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner"
          )}>
            <Card
              className={cn(
                "lottery-banner-card",
                isWin && "lottery-banner-win",
                isTaken && "lottery-banner-taken",
                !isWin && !isTaken && "lottery-banner-miss",
                "flex min-w-36 flex-col items-center gap-1 text-center animate-banner",
                isWin && "bg-teal-600 text-white",
                isTaken && "border-cs-border bg-cs-elevated",
                !isWin && !isTaken && "bg-red-600 text-white"
              )}
              shadow="md"
              withBorder={false}
            >
              <Text className={cn("lottery-banner-label", "opacity-80")} size="sm">
                {bannerTitle}
              </Text>
              <Text className={cn("lottery-banner-copy", "font-headings text-base font-bold")}>
                {bannerCopy}
              </Text>
            </Card>
          </div>,
        document.body
      )}
    </div>
  )
})

export default LotteryGame
