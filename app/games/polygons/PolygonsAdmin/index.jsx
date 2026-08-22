import React from "react"
import { Button, Card, CopyButton, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { fetchLottery, selectLottery, unwatchLottery, watchLottery } from ".."
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"


const LotteryAdmin = ({ address }) => {
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, memberShares, totalBalance } = lottery
  const pot = clampEth(prize)
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  const numberClass = cn("lottery-admin-stat-value", "font-headings text-base font-extrabold leading-[1.15] text-cs-accent")

  React.useEffect(() => {
    fetchLottery(address)
    watchLottery(address)
    return () => unwatchLottery(address)
  }, [address, account])

  return (
    <div className={cn("lottery-admin", "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden")}>
      <div className={cn("lottery-admin-stats", "grid min-w-0 grid-cols-2 gap-2")}>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-yours", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(memberShares, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>You</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-bankroll", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={cn(numberClass, bankrollClass(totalBalance, ticketPrice))}>{ethLabel(totalBalance, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Bankroll</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-polygons", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{claimedCount || 0}/{polygonCount || 0}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Claimed</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-lose", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{loseLit || 0}/{loseCount || 0}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>House</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-ticket", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(ticketPrice, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Ticket</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-prize", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(pot, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Pot</span>
        </div>
      </div>
      <Card className={cn("lottery-admin-link", "flex shrink-0 flex-row items-center justify-between gap-2 overflow-visible py-2")}>
        <div className={cn("lottery-admin-link-body", "min-w-0 flex-1 overflow-hidden")}>
          <Text className={cn("lottery-admin-link-label")} size="xs" c="dimmed">Player link</Text>
          <Text className={cn("lottery-admin-link-url", "block overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] text-cs-body")}>
            {tableUrl}
          </Text>
        </div>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <Button
              className={cn("lottery-admin-copy", copied && "lottery-admin-copied", "shrink-0")}
              variant="subtle"
              color={copied ? "teal" : "gray"}
              onClick={copy}
            >
              {copied && "Copied"}
              {!copied && "Copy"}
            </Button>
          )}
        </CopyButton>
      </Card>
    </div>
  )
}

export default LotteryAdmin
