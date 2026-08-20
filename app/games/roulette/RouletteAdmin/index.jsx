import React from "react"
import { Button, Card, CopyButton, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette } from ".."
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { arc, pie } from "d3-shape"
import _ from "lodash"
import { bankrollClass, clampEth, ethLabel, MIN_BET, tableMaxBet } from "../chips"
import { selectNativeSymbol } from "app/core/chain"


const CHART_SIZE = 192
const CHART_OUTER = 88
const CHART_INNER = 62


const RouletteAdmin = ({ address }) => {
  const { account } = useSelector(() => selectAuth()) || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { memberShares, totalBalance, minBet, maxBet } = roulette
  const share = clampEth(memberShares)
  const bankroll = clampEth(totalBalance)
  const rest = _.max([bankroll - share, 0])
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  let pct = 0
  if (bankroll > 0) pct = Math.round((share / bankroll) * 100)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  const numberClass = cn("roulette-admin-stat-value", "font-headings text-base font-extrabold leading-[1.15] text-cs-accent")
  const shareColor = "var(--color-cs-accent)"

  const pieData = []
  if (share > 0) pieData.push({ key: "yours", value: share, color: shareColor })
  if (rest > 0) pieData.push({ key: "rest", value: rest, color: "var(--color-cs-border)" })
  if (pieData.length === 0) pieData.push({ key: "rest", value: 1, color: "var(--color-cs-border)" })

  const sliceArc = arc().innerRadius(CHART_INNER).outerRadius(CHART_OUTER)
  const arcs = pie()
    .sort(null)
    .padAngle(pieData.length > 1 ? 0.04 : 0)
    .value((d) => d.value)(pieData)

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address, account])

  return (
    <div className={cn("roulette-admin", "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden")}>
      <div className={cn("roulette-admin-share", "flex min-h-0 items-center gap-3")}>
        <div className={cn("roulette-admin-chart", "relative size-32 shrink-0")}>
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            className={cn("roulette-admin-chart-svg", "block size-full")}
          >
            <g className={cn("roulette-admin-chart-slices")} transform={`translate(${CHART_SIZE / 2}, ${CHART_SIZE / 2})`}>
              {arcs.map((item) => (
                <path
                  key={item.data.key}
                  className={cn("roulette-admin-slice", `roulette-admin-slice-${item.data.key}`)}
                  d={sliceArc(item)}
                  fill={item.data.color}
                />
              ))}
            </g>
          </svg>
          <div className={cn("roulette-admin-chart-center", "pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center")}>
            <Text className={cn("roulette-admin-share-amount", "font-headings text-[0.875rem] leading-tight font-bold")}>
              {ethLabel(memberShares, symbol)}
            </Text>
            <Text className={cn("roulette-admin-share-pct")} size="xs" c="dimmed">{pct}%</Text>
          </div>
        </div>
        <div className={cn("roulette-admin-stats", "grid min-w-0 flex-1 grid-cols-2 gap-2")}>
          <div className={cn("roulette-admin-stat", "roulette-admin-stat-yours", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
            <span className={numberClass}>{ethLabel(memberShares, symbol)}</span>
            <span className={cn("roulette-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>You</span>
          </div>
          <div className={cn("roulette-admin-stat", "roulette-admin-stat-others", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
            <span className={numberClass}>{ethLabel(rest, symbol)}</span>
            <span className={cn("roulette-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Others</span>
          </div>
          <div className={cn("roulette-admin-stat", "roulette-admin-stat-bankroll", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
            <span className={cn(numberClass, bankrollClass(bankroll, maxBet))}>{ethLabel(bankroll, symbol)}</span>
            <span className={cn("roulette-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Bankroll</span>
          </div>
          <div className={cn("roulette-admin-stat", "roulette-admin-stat-pct", "rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2")}>
            <span className={numberClass}>{pct}%</span>
            <span className={cn("roulette-admin-stat-label", "mt-0.5 block text-[0.75rem] text-cs-muted")}>Share</span>
          </div>
        </div>
      </div>
      <Card className={cn("roulette-admin-limits", "flex shrink-0 flex-col gap-1 py-2")}>
        <Text className={cn("roulette-admin-limits-label")} size="xs" c="dimmed">Limits</Text>
        <Text className={cn("roulette-admin-limits-value")} size="sm">
          {ethLabel(minBetAmount, symbol)} – {ethLabel(maxBetAmount, symbol)}
        </Text>
      </Card>
      <Card className={cn("roulette-admin-link", "flex shrink-0 flex-row items-center justify-between gap-2 overflow-visible py-2")}>
        <div className={cn("roulette-admin-link-body", "min-w-0 flex-1 overflow-hidden")}>
          <Text className={cn("roulette-admin-link-label")} size="xs" c="dimmed">Player link</Text>
          <Text className={cn("roulette-admin-link-url", "block overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] text-cs-body")}>
            {tableUrl}
          </Text>
        </div>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <Button
              className={cn("roulette-admin-copy", copied && "roulette-admin-copied", "shrink-0")}
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

export default RouletteAdmin
