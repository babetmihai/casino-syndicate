import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import { Button, Card, Text } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import history from "app/core/history"
import { useSelector } from "react-redux"
import { selectContract } from "app/core/wallet"
import { fetchTables, selectTables } from "app/core/tables"
import "./index.scss"

const TableList = () => {
  const { t } = useTranslation()
  const contract = useSelector(() => selectContract())

  const tables = useSelector(() => selectTables())

  React.useEffect(() => {
    if (contract) {
      fetchTables()
    }
  }, [contract])

  return (
    <AppScreen
      name={t("tables")}
      onBack={() => {
        history.replace("/")
      }}
    >
      <div className="TableList_root">
        <div className="TableList_header">
          <Button
            onClick={() => {
              showModal(TableModal)
            }}
          >
            {t("create_table")}
          </Button>
        </div>
        <div className="TableList_list">
          {Object.values(tables).map((table) => {
            const { id, name } = table
            return (
              <Card key={id} className="TableList_card">
                <Text>{name}</Text>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    history.push(`/tables/${id}`)
                  }}
                >
                  {t("view")}
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </AppScreen>
  )
}

export default TableList
