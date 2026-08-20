import React from "react"
import { ActionIcon, Card, CopyButton, Text } from "@mantine/core"
import "./index.scss"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette } from ".."
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { arc, pie } from "d3-shape"
import _ from "lodash"
import { clampEth, ethLabel, isTableLocked, MIN_BET, tableMaxBet } from "../chips"


const CHART_SIZE = 192
const CHART_OUTER = 88
const CHART_INNER = 62


const RouletteAdmin = ({ address }) => {
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
  let shareColor = "var(--mantine-color-indigo-6)"
  if (tableLocked) shareColor = "var(--mantine-color-red-6)"

  const pieData = []
  if (share > 0) pieData.push({ key: "yours", value: share, color: shareColor })
  if (rest > 0) pieData.push({ key: "rest", value: rest, color: "var(--mantine-color-gray-3)" })
  if (pieData.length === 0) pieData.push({ key: "rest", value: 1, color: "var(--mantine-color-gray-3)" })

  const sliceArc = arc().innerRadius(CHART_INNER).outerRadius(CHART_OUTER)
  const arcs = pie()
    .sort(null)
    .padAngle(pieData.length > 1 ? 0.04 : 0)
    .value((d) => d.value)(pieData)

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  return (
    <div className="RouletteAdmin_content">
      <div className="RouletteAdmin_share" data-locked={tableLocked}>
        <div className="RouletteAdmin_chart">
          <svg
            viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
            className="RouletteAdmin_pie"
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
          <div className="RouletteAdmin_chartCenter">
            <Text className="RouletteAdmin_shareValue">
              {ethLabel(memberShares)}
            </Text>
            <Text size="sm" c="dimmed">{pct}%</Text>
          </div>
        </div>
        <div className="RouletteAdmin_legend">
          <div className="RouletteAdmin_legendItem">
            <span className="RouletteAdmin_swatch is-yours" />
            <Text size="sm">You</Text>
            <Text size="sm" c="dimmed">{ethLabel(memberShares)}</Text>
          </div>
          <div className="RouletteAdmin_legendItem">
            <span className="RouletteAdmin_swatch is-rest" />
            <Text size="sm">Others</Text>
            <Text size="sm" c="dimmed">{ethLabel(rest)}</Text>
          </div>
        </div>
      </div>
      <Card className="RouletteAdmin_limits">
        <Text size="sm">
          <Text span c="dimmed">Min</Text> {ethLabel(minBetAmount)} · <Text span c="dimmed">Max</Text> {ethLabel(maxBetAmount)}
        </Text>
        {tableLocked &&
          <Text size="sm" c="red">
            Locked. Bankroll must be at least 100× max.
          </Text>
        }
      </Card>
      <Card className="RouletteAdmin_invite">
        <div className="RouletteAdmin_inviteInfo">
          <Text size="sm" c="dimmed">Player link</Text>
          <Text className="RouletteAdmin_link">{tableUrl}</Text>
        </div>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <ActionIcon
              size="lg"
              onClick={copy}
              color={copied ? "teal" : "gray"}
              aria-label="Copy link"
            >
              {copied && <CheckIcon size={18} />}
              {!copied && <CopyIcon size={18} />}
            </ActionIcon>
          )}
        </CopyButton>
      </Card>
    </div>
  )
}

export default RouletteAdmin
