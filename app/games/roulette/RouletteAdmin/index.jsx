import React from "react"
import { ActionIcon, Card, CopyButton, Text, TextInput } from "@mantine/core"
import "./index.scss"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette } from ".."
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"


const STAT_LABELS = {
  totalBalance: "Table bankroll",
  totalShares: "Total shares",
  memberShares: "Your shares"
}

const RouletteAdmin = ({ address }) => {
  const roulette = useSelector(() => selectRoulette(address)) || {}

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  const tableUrl = `${window.location.origin}/#/tables/${address}`

  return (
    <div className="RouletteAdmin_content">
      <TextInput
        label="Player link"
        value={tableUrl}
        readOnly
        rightSection={
          <CopyButton value={tableUrl}>
            {({ copied, copy }) => (
              <ActionIcon
                onClick={copy}
                color={copied ? "teal" : "gray"}
                aria-label="Copy link"
              >
                {copied && <CheckIcon size={16} />}
                {!copied && <CopyIcon size={16} />}
              </ActionIcon>
            )}
          </CopyButton>
        }
      />
      <Card className="RouletteAdmin_stats">
        {Object.keys(STAT_LABELS).map((key) => (
          <div className="RouletteAdmin_stat" key={key}>
            <Text size="sm" c="dimmed">{STAT_LABELS[key]}</Text>
            <Text fw={500}>
              {roulette[key] || "0"} ETH
            </Text>
          </div>
        ))}
      </Card>
    </div>
  )
}

export default RouletteAdmin
