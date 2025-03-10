import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import { Button } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import history from "app/core/history"
import { useSelector } from "react-redux"
import { selectWallet } from "app/core/wallet" 

const TableList = () => {      
  const { t } = useTranslation()  
  const { contract, account } = useSelector(() => selectWallet())

  React.useEffect(() => {
    if (contract && account) {
      const init = async () => {
        try {
          const tables = await contract.getTables()
          console.log("Tables:", tables)
        } catch (error) {
          console.error("Failed to fetch balance:", error)
        }
      }
      init() 
    }

  }, [contract, account])

  return (
    <AppScreen
      name={t("tables")}
      onBack={() => {
        history.replace("/")
      }}
    >
      <Button
        onClick={() => {
          showModal(TableModal)
        }}
      >
        {t("create_table")}
      </Button>
    </AppScreen>
  )
}

export default TableList
