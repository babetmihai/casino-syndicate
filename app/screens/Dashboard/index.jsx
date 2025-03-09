import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button } from "@mantine/core"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectWallet } from "app/core/wallet"
import { useTranslation } from "react-i18next"

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
  return (
    <AppScreen name={t("dashboard")}>
      <Link to="/tables">
        <Button>
          {t("tables")}
        </Button>
      </Link>

    </AppScreen>
  )
}

export default DashboardScreen
