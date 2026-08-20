import React from "react"
import { ActionIcon, Button, Card, CopyButton, NumberInput, Text } from "@mantine/core"
import "./index.scss"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette, setRouletteLimits } from ".."
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { arc, pie } from "d3-shape"
import _ from "lodash"
import { ethers } from "ethers"
import { selectAuth } from "app/core/auth"
import { selectTable } from "app/core/tables"
import { chipsLabel } from "../chips"


const CHART_SIZE = 192
const CHART_OUTER = 88
const CHART_INNER = 62


const RouletteAdmin = ({ address }) => {
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { account } = useSelector(() => selectAuth()) || {}
  const table = useSelector(() => selectTable(address)) || {}
  const { memberShares, totalBalance, minBet, maxBet } = roulette
  const { createdBy } = table
  const share = Number(memberShares) || 0
  const bankroll = Number(totalBalance) || 0
  const rest = _.max([bankroll - share, 0])
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  let pct = 0
  if (bankroll > 0) pct = Math.round((share / bankroll) * 100)
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)
  const [minValue, setMinValue] = React.useState(1)
  const [maxValue, setMaxValue] = React.useState(1)
  const [saving, setSaving] = React.useState(false)
  const canSave = minValue >= 1 && maxValue >= minValue && maxValue <= bankroll

  const pieData = []
  if (share > 0) pieData.push({ key: "yours", value: share, color: "var(--mantine-color-indigo-6)" })
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

  React.useEffect(() => {
    if (minBet == null) return
    setMinValue(Number(minBet))
    setMaxValue(Number(maxBet))
  }, [minBet, maxBet])

  return (
    <div className="RouletteAdmin_content">
      <div className="RouletteAdmin_share">
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
              {chipsLabel(memberShares)}
            </Text>
            <Text size="sm" c="dimmed">{pct}%</Text>
          </div>
        </div>
        <div className="RouletteAdmin_legend">
          <div className="RouletteAdmin_legendItem">
            <span className="RouletteAdmin_swatch is-yours" />
            <Text size="sm">You</Text>
            <Text size="sm" c="dimmed">{chipsLabel(memberShares)}</Text>
          </div>
          <div className="RouletteAdmin_legendItem">
            <span className="RouletteAdmin_swatch is-rest" />
            <Text size="sm">Others</Text>
            <Text size="sm" c="dimmed">{chipsLabel(rest)}</Text>
          </div>
        </div>
      </div>
      {isOwner &&
        <Card className="RouletteAdmin_limits">
          <div className="RouletteAdmin_limitsHead">
            <Text fw={500}>Table limits</Text>
            <Text size="sm" c="dimmed">
              Bankroll {chipsLabel(bankroll)}. Max cannot exceed bankroll.
            </Text>
          </div>
          <div className="RouletteAdmin_limitsFields">
            <NumberInput
              label="Minimum"
              min={1}
              max={bankroll}
              step={1}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              hideControls
              value={minValue}
              onChange={(value) => setMinValue(Number(value) || 1)}
            />
            <NumberInput
              label="Maximum"
              min={1}
              max={bankroll}
              step={1}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              hideControls
              value={maxValue}
              onChange={(value) => setMaxValue(Number(value) || 1)}
            />
          </div>
          <Button
            loading={saving}
            disabled={!canSave}
            onClick={async () => {
              setSaving(true)
              try {
                await setRouletteLimits(address, { minBet: minValue, maxBet: maxValue })
              } finally {
                setSaving(false)
              }
            }}
          >
            Save limits
          </Button>
        </Card>
      }
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
