import React from "react"
import { Button, Card, CopyButton, Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette } from ".."
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { arc, pie } from "d3-shape"
import _ from "lodash"
import { clampEth, ethLabel, isTableLocked, MIN_BET, tableMaxBet } from "../chips"


const CHART_SIZE = 192
const CHART_OUTER = 88
const CHART_INNER = 62


const RouletteAdmin = ({ address }) => {
  const { account } = useSelector(() => selectAuth()) || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, totalBalance, minBet, maxBet, locked } = roulette
  const share = clampEth(memberShares)
  const bankroll = clampEth(totalBalance)
  const rest = _.max([bankroll - share, 0])
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  let pct = 0
  if (bankroll > 0) pct = Math.round((share / bankroll) * 100)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet, bankroll)
  const tableLocked = locked || isTableLocked(bankroll, maxBet)
  let shareColor = "var(--color-cs-accent)"
  if (tableLocked) shareColor = "var(--mantine-color-red-6)"
  const numberClass = cn(
    "font-headings text-base font-extrabold leading-[1.15] text-cs-accent",
    tableLocked && "text-red-600"
  )

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
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex min-h-0 items-center gap-3">
        <div className="relative size-24 shrink-0">
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            className="block size-full"
          >
            <g transform={`translate(${CHART_SIZE / 2}, ${CHART_SIZE / 2})`}>
              {arcs.map((item) => (
                <path
                  key={item.data.key}
                  d={sliceArc(item)}
                  fill={item.data.color}
                />
              ))}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
            <Text className={cn("font-headings text-[0.875rem] leading-tight font-bold", tableLocked && "text-red-600")}>
              {ethLabel(memberShares)}
            </Text>
            <Text size="xs" c="dimmed">{pct}%</Text>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <div className="rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2">
            <span className={numberClass}>{ethLabel(memberShares)}</span>
            <span className="mt-0.5 block text-[0.75rem] text-cs-muted">You</span>
          </div>
          <div className="rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2">
            <span className={numberClass}>{ethLabel(rest)}</span>
            <span className="mt-0.5 block text-[0.75rem] text-cs-muted">Others</span>
          </div>
          <div className="rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2">
            <span className={numberClass}>{ethLabel(bankroll)}</span>
            <span className="mt-0.5 block text-[0.75rem] text-cs-muted">Bankroll</span>
          </div>
          <div className="rounded-[0.75rem] border border-cs-border bg-cs-surface px-3 py-2">
            <span className={numberClass}>{pct}%</span>
            <span className="mt-0.5 block text-[0.75rem] text-cs-muted">Share</span>
          </div>
        </div>
      </div>
      <Card className="flex shrink-0 flex-col gap-1 py-2">
        <Text size="xs" c="dimmed">Limits</Text>
        <Text size="sm">
          {ethLabel(minBetAmount)} – {ethLabel(maxBetAmount)}
        </Text>
        {tableLocked &&
          <Text size="xs" c="red">
            Locked. Bankroll must be at least 100× max.
          </Text>
        }
      </Card>
      <Card className="flex shrink-0 flex-row items-center justify-between gap-2 py-2">
        <div className="min-w-0">
          <Text size="xs" c="dimmed">Player link</Text>
          <Text className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.75rem] text-cs-body">
            {tableUrl}
          </Text>
        </div>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <Button
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
