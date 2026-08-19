import React from "react"
import { ActionIcon, Button, Card, CopyButton, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import "./index.scss"
import { useSelector } from "react-redux"
import { buyTableShares, fetchRoulette, selectRoulette } from ".."
import { Check, Copy } from "tabler-icons-react"
import { Link } from "react-router-dom"


const RouletteAdmin = ({ address }) => {
  const { t } = useTranslation()
  const roulette = useSelector(() => selectRoulette(address))

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  const tableUrl = `${window.location.origin}/#/tables/${address}`

  return (
    <div className="RouletteAdmin_content">
      <div className="RouletteAdmin_header">
        <Button
          onClick={() => showModal(DepositModal, {
            onSubmit: async ({ balance }) => {
              await buyTableShares({ balance }, address)
            }
          })}
        >
          {t("deposit")}
        </Button>
        <Button variant="subtle">
          {t("withdraw")}
        </Button>
        <Link to={`/tables/${address}`}>
          <Button variant="subtle">
            {t("play")}
          </Button>
        </Link>
      </div>
      <Card className="RouletteAdmin_url">
        <Text flex={1}>{tableUrl}</Text>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <ActionIcon
              onClick={copy}
              color={copied ? "green" : "gray"}
            >
              {copied && <Check />}
              {!copied && <Copy />}
            </ActionIcon>
          )}
        </CopyButton>
      </Card>
      {Object.entries(roulette).map(([key, value]) => (
        <Text c="dimmed" key={key}>
          {key}: {value}
        </Text>
      ))}
    </div>
  )
}

export default RouletteAdmin
