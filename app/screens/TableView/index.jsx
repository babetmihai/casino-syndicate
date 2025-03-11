import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { fetchTableInfo, selectTable } from "app/core/tables"
import "./index.scss"
import history from "app/core/history"


const TableView = () => {
  const { t } = useTranslation()
  const { id } = useParams()

  React.useEffect(() => {
    fetchTableInfo(id)
      .catch((error) => {
        if (error.message === "table_not_found") {
          history.replace("/tables")
        }
      })
  }, [id])

  const table = useSelector(() => selectTable(id))
  const { name = "" } = table

  return (
    <AppScreen
      name={`${t("table")} ${name}`}
      onBack={() => {
        history.replace("/tables")
      }}
    >
      {id}
    </AppScreen>
  )
}

export default TableView
