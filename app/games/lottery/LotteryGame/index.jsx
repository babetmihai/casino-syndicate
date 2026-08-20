import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { buyLotteryTicket, chanceLabel, fetchLottery, selectLottery, withdrawLotteryPrize } from ".."
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
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, winPercent, ticketPrice, claimedCount, prize, myPrize, owners = [], lastTicket } = lottery
  const { won, polygonId, assigned } = lastTicket || {}
  const mineCount = _.filter(owners, (owner) => owner && account && ethers.getAddress(owner) === ethers.getAddress(account)).length
  const remaining = _.max([0, (polygonCount || 0) - (claimedCount || 0)])
  const canBuy = account && !buying && remaining > 0 && !showBanner
  const hasPrize = clampEth(myPrize) > 0
  let focusId
  if (showBanner && won) focusId = polygonId
  let bannerTitle = "No reveal"
  let bannerCopy = "The ticket missed"
  if (won && assigned) {
    bannerTitle = "Polygon claimed"
    bannerCopy = `Sector ${polygonId + 1} is yours`
  }
  if (won && !assigned) {
    bannerTitle = "Already claimed"
    bannerCopy = `Sector ${polygonId + 1} was taken`
  }
  if (lastTicket && lastTicket.settled) {
    bannerTitle = "Map complete"
    bannerCopy = `Prize ${ethLabel(prize, symbol)} split`
  }
  let buyLabel = "Buy ticket"
  if (buying) buyLabel = "Drawing"

  React.useEffect(() => {
    fetchLottery(address)
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
      const ticket = await buyLotteryTicket(address)
      if (!ticket) {
        setBuying(false)
        return
      }
      setShowBanner(true)
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
        </Text>
        <Text className={cn("lottery-chance", "shrink-0 whitespace-nowrap")} size="xs" c="dimmed">
          {chanceLabel(winPercent)}
        </Text>
        <Text className={cn("lottery-prize", "shrink-0 whitespace-nowrap text-cs-accent")} size="xs">
          {ethLabel(prize, symbol)}
        </Text>
      </div>
      <Card className={cn("lottery-map-card", "flex min-h-0 w-full flex-1 flex-col overflow-hidden")} padding={0}>
        <div className={cn("lottery-map-frame", "flex min-h-0 w-full flex-1 p-1.5")}>
          <LotteryMap
            address={address}
            owners={owners}
            polygonCount={polygonCount}
            account={account}
            focusId={focusId}
          />
        </div>
      </Card>
      <div className={cn("lottery-controls", "flex w-full shrink-0 items-center gap-2")}>
        {account &&
          <Text className={cn("lottery-holdings", "min-w-0 flex-1 truncate")} size="xs" c="dimmed">
            You {mineCount}/{polygonCount || 0}
          </Text>
        }
        {!account &&
          <Button className={cn("lottery-connect", "flex-1")} onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account && hasPrize &&
          <Button
            className={cn("lottery-claim", "shrink-0")}
            variant="outline"
            color="gray"
            loading={claiming}
            onClick={onClaim}
          >
            Claim {ethLabel(myPrize, symbol)}
          </Button>
        }
        {account &&
          <Button
            className={cn("lottery-buy", "flex-1")}
            disabled={!canBuy}
            loading={buying}
            onClick={onBuy}
          >
            {buyLabel} · {ethLabel(ticketPrice, symbol)}
          </Button>
        }
      </div>
      {createPortal(
        showBanner &&
          <div className={cn("lottery-banner", "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner")}>
            <Card
              className={cn(
                "lottery-banner-card",
                won && assigned && "lottery-banner-win",
                won && !assigned && "lottery-banner-taken",
                !won && "lottery-banner-miss",
                "flex min-w-36 flex-col items-center gap-1 text-center animate-banner",
                won && assigned && "bg-teal-600 text-white",
                won && !assigned && "border-cs-border bg-cs-elevated",
                !won && "bg-red-600 text-white"
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
