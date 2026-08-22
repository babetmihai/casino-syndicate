import React from "react"
import { Button, Card, CopyButton, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { fetchPolygons, selectPolygons, unwatchPolygons, watchPolygons } from ".."
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { bankrollClass, clampEth, ethLabel } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"


const PolygonsAdmin = ({ address }) => {
  const { account } = useSelector(() => selectAuth()) || {}
  const polygons = useSelector(() => selectPolygons(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { polygonCount, loseCount, ticketPrice, claimedCount, loseLit, prize, memberShares, totalBalance } = polygons
  const pot = clampEth(prize / 2)
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  const numberClass = cn("polygons-admin-stat-value", "font-headings text-base font-extrabold leading-[1.15] text-cs-accent")

  React.useEffect(() => {
    fetchPolygons(address)
    watchPolygons(address)
    return () => unwatchPolygons(address)
  }, [address, account])

  return (
    <div className={cn("polygons-admin", "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden")}>
      <div className={cn("polygons-admin-stats", "grid min-w-0 grid-cols-2 gap-2")}>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-yours", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(memberShares, symbol)}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>You</span>
        </div>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-bankroll", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={cn(numberClass, bankrollClass(totalBalance, ticketPrice))}>{ethLabel(totalBalance, symbol)}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Bankroll</span>
        </div>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-polygons", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{claimedCount || 0}/{polygonCount || 0}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Claimed</span>
        </div>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-lose", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{loseLit || 0}/{loseCount || 0}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>House</span>
        </div>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-ticket", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(ticketPrice, symbol)}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Ticket</span>
        </div>
        <div className={cn("polygons-admin-stat", "polygons-admin-stat-prize", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
          <span className={numberClass}>{ethLabel(pot, symbol)}</span>
          <span className={cn("polygons-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Pot</span>
        </div>
      </div>
      <Card className={cn("polygons-admin-link", "flex shrink-0 flex-row items-center justify-between gap-2 overflow-visible py-2")}>
        <div className={cn("polygons-admin-link-body", "min-w-0 flex-1 overflow-hidden")}>
          <Text className={cn("polygons-admin-link-label")} size="xs" c="dimmed">Player link</Text>
          <Text className={cn("polygons-admin-link-url", "block overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] text-cs-body")}>
            {tableUrl}
          </Text>
        </div>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <Button
              className={cn("polygons-admin-copy", copied && "polygons-admin-copied", "shrink-0")}
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

export default PolygonsAdmin
