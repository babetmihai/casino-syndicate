import React from "react"
import { ActionIcon, Card, CopyButton, Text } from "@mantine/core"
import "./index.scss"
import { useSelector } from "react-redux"
import { fetchRoulette, selectRoulette } from ".."
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"


const RouletteAdmin = ({ address }) => {
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, totalBalance } = roulette
  const share = Number(memberShares) || 0
  const bankroll = Number(totalBalance) || 0
  const hasShare = share > 0
  const tableUrl = `${window.location.origin}/#/tables/${address}`
  let bankrollLabel = `${totalBalance || "0"} ETH bankroll`
  if (hasShare && bankroll > 0) {
    const pct = Math.round((share / bankroll) * 100)
    bankrollLabel = `${pct}% of ${totalBalance} ETH`
  }

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  return (
    <div className="RouletteAdmin_content">
      <div className="RouletteAdmin_share">
        <Text size="sm" c="dimmed">Your share</Text>
        <Text className="RouletteAdmin_shareValue">
          {memberShares || "0"} ETH
        </Text>
        <Text size="sm" c="dimmed">{bankrollLabel}</Text>
      </div>
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
