import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button } from "@mantine/core"
import { useContract } from "app/core/wallet"
import { useTranslation } from "react-i18next"
import { ethers } from "ethers"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import { useParams } from "react-router-dom"
import "./index.scss"
import { useTable } from "app/core/tables"


const TableScreen = () => {
  const { t } = useTranslation()
  const { tableId } = useParams()
  const [table] = useTable(tableId)
  const { name, address, abi } = table
  const [contract] = useContract(address, abi)


  React.useEffect(() => {
    if (contract) {
      const init = async () => {
        console.log("init")
        try {
          const table = await contract.getTable()
          console.log("Table:", table)
        } catch (error) {
          console.error("Failed to fetch table:", error)
        }
      }
      init()
    }

  }, [contract])


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
    <AppScreen name={`${t("table")} ${name}`}>
      <div className="TableScreen_content">
        <div className="TableScreen_header">
          <Button
            onClick={() => showModal(DepositModal, {
              onSubmit: async ({ balance }) => {
                await contract.depositShares({
                  value: ethers.parseEther(balance.toString())
                })
              }
            })}
          >
            {t("deposit")}
          </Button>
        </div>
      </div>
    </AppScreen>
  )
}

export default TableScreen
