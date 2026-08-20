import React from "react"
import { Button, Card, CopyButton, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { chanceLabel, fetchLottery, selectLottery } from ".."
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"


const LotteryAdmin = ({ address }) => {
  const { account } = useSelector(() => selectAuth()) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, winPercent, ticketPrice, claimedCount, prize } = lottery
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  const numberClass = cn("lottery-admin-stat-value", "font-headings text-base font-extrabold leading-[1.15] text-cs-accent")

  React.useEffect(() => {
    fetchLottery(address)
  }, [address, account])

  return (
    <div className={cn("lottery-admin", "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden")}>
      <div className={cn("lottery-admin-stats", "grid min-w-0 grid-cols-2 gap-2")}>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-polygons", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{claimedCount || 0}/{polygonCount || 0}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Claimed</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-chance", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{chanceLabel(winPercent)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Chance</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-ticket", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(ticketPrice, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Ticket</span>
        </div>
        <div className={cn("lottery-admin-stat", "lottery-admin-stat-prize", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(prize, symbol)}</span>
          <span className={cn("lottery-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Prize</span>
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
