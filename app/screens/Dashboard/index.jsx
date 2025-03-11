import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectWallet } from "app/core/wallet"
import { useTranslation } from "react-i18next"
import { ethers } from "ethers"
import "./index.scss"

const DashboardScreen = () => {
  const { t } = useTranslation()
  const { contract, account } = useSelector(() => selectWallet())

  React.useEffect(() => {
    if (contract && account) {
      const init = async () => {
        console.log("init")
        try {
          const balance = await contract.getContractBalance()
          console.log("Balance:", balance)
        } catch (error) {
          console.error("Failed to fetch balance:", error)
        }
      }
      init()
    }

  }, [contract, account])


  React.useEffect(() => {
    if (contract) {
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
    }
  }, [contract])


  return (
    <AppScreen name={t("dashboard")}>
      <div className="Dashboard_content">
        <div className="Dashboard_header">
          <Button>
            {t("deposit")}
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

export default DashboardScreen
