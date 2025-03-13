import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { ethers } from "ethers"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import "./index.scss"
import history from "app/core/history"
import { useSelector } from "react-redux"
import { buyTableShares, fetchRoulette, selectRoulette } from ".."


const RouletteScreen = ({ table, contract }) => {
  const { t } = useTranslation()
  const { name, address } = table
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


  return (
    <AppScreen
      name={`${t("table")} ${name}`}
      onBack={() => history.replace("/")}
    >
      <div className="TableScreen_content">
        <div className="TableScreen_header">
          <Button
            onClick={() => showModal(DepositModal, {
              onSubmit: async ({ balance }) => {
                await buyTableShares({ balance }, contract)
              }
            })}
          >
            {t("deposit")}
          </Button>
          {Object.entries(roulette).map(([key, value]) => (
            <Text c="dimmed" key={key}>
              {key}: {value}
            </Text>
          ))}
        </div>
      </div>
    </AppScreen>
  )
}

export default RouletteScreen
