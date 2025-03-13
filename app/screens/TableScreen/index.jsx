import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button, Text } from "@mantine/core"
import { useContract } from "app/core/tables"
import { useTranslation } from "react-i18next"
import { ethers } from "ethers"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import { useParams } from "react-router-dom"
import "./index.scss"
import { fetchTableData, useTable } from "app/core/tables"
import history from "app/core/history"
import { useSelector } from "react-redux"
import { selectTableData } from "app/core/tables"


const TableScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const [table] = useTable(address)

  const { name, abi } = table
  const [contract] = useContract(address, abi)
  const tableData = useSelector(() => selectTableData(address))

  React.useEffect(() => {
    if (contract) {
      if (contract) fetchTableData(address)
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
    <AppScreen
      name={`${t("table")} ${name}`}
      onBack={() => history.replace("/")}
    >
      <div className="TableScreen_content">
        <div className="TableScreen_header">
          <Button
            onClick={() => showModal(DepositModal, {
              onSubmit: async ({ balance }) => {
                await window.ethereum.request({ method: "eth_requestAccounts" })
                const tx = await contract.depositShares({
                  value: ethers.parseEther(balance.toString())
                })
                await tx.wait()
                await fetchTableData(address)
              }
            })}
          >
            {t("deposit")}
          </Button>
          {Object.entries(tableData).map(([key, value]) => (
            <Text c="dimmed" key={key}>
              {key}: {value}
            </Text>
          ))}
        </div>
      </div>
    </AppScreen>
  )
}

export default TableScreen
