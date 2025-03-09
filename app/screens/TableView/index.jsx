import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"

const TableView = () => {
  const { t } = useTranslation()
  return (
    <AppScreen name={t("table_view")}>

    </AppScreen>
  )
}

export default TableView
