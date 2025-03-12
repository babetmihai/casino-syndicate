import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import "./index.scss"
import { useSelector } from "react-redux"
import { createTable, fetchTables, selectTables } from "app/core/tables"
import { Button, Card } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import history from "app/core/history"
import _ from "lodash"

const MainScreen = () => {
  const { t } = useTranslation()

  const tables = useSelector(() => selectTables())
  React.useEffect(() => {
    fetchTables()
  }, [])


  return (
    <AppScreen name={t("casino_syndicate")}>
      <div className="MainScreen_content">
        <div className="MainScreen_header">
          <Button
            onClick={() => showModal(TableModal, {
              onSubmit: async (values) => {
                await createTable(values)
              }
            })}
          >
            {t("create_table")}
          </Button>
        </div>
        <div className="MainScreen_tables">
          {_.orderBy(Object.values(tables), ["createdAt"], ["desc"])
            .map((table) => (
              <Card
                onClick={() => history.push(`/tables/${table.id}`)}
                key={table.id} className="MainScreen_table"
              >
                <div className="MainScreen_table_name">{table.name}</div>
                <div className="MainScreen_table_address">{table.address}</div>

              </Card>
            ))}
        </div>
      </div>
    </AppScreen>
  )
}

export default MainScreen
