import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"

const TableList = () => {
  const { t } = useTranslation()

  return (
    <AppScreen name={t("tables")}>

    </AppScreen>
  )
}

export default TableList
