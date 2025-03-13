import React from "react"
import { ActionIcon, Button, Card, CopyButton, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { ethers } from "ethers"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import "./index.scss"
import { useSelector } from "react-redux"
import { buyTableShares, fetchRoulette, selectRoulette } from ".."
import { Check, Copy } from "tabler-icons-react"


const RouletteAdmin = ({ address, contract }) => {
  const { t } = useTranslation()
  const roulette = useSelector(() => selectRoulette(address))
  React.useEffect(() => {
    fetchRoulette(contract)
  }, [])

  React.useEffect(() => {
    // Set up event listener for Deposited events
    contract.on("Deposited", (user, amount, event) => {
      const deposit = {
        user,
        amount: ethers.formatEther(amount), // Convert wei to Ether
        txHash: event.transactionHash
      }

      console.log("Deposit:", deposit)
      console.log(`Deposit from ${user}: ${ethers.formatEther(amount)} ETH`)
    })

    // Cleanup listener on component unmount
    return () => {
      contract.removeAllListeners("Deposited")
    }
  }, [])

  const tableUrl = `${window.location.origin}/#/tables/${address}`
  return (
    <div className="RouletteAdmin_content">
      <div className="RouletteAdmin_header">
        <Button
          onClick={() => showModal(DepositModal, {
            onSubmit: async ({ balance }) => {
              await buyTableShares({ balance }, contract)
            }
          })}
        >
          {t("deposit")}
        </Button>

        <Button variant="light">
          {t("withdraw")}
        </Button>
      </div>
      <Card className="RouletteAdmin_url">
        <Text flex={1}>{tableUrl}</Text>
        <CopyButton value={tableUrl}>
          {({ copied, copy }) => (
            <ActionIcon
              onClick={copy}
              color={copied ? "green" : "gray"}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
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
