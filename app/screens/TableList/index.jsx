import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import { Button } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import history from "app/core/history"

const TableList = () => {
  const { t } = useTranslation()

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
