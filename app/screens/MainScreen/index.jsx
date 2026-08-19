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
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"


const MainScreen = () => {
  const { t } = useTranslation()
  const { account } = useSelector(() => selectAuth())
  const tables = useSelector(() => selectTables())

  React.useEffect(() => {
    fetchTables()
  }, [account])

  const ownedTables = _.orderBy(Object.values(tables), ["createdAt"], ["desc"]).filter((table) => {
    const { createdBy } = table || {}
    return createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)
  })

  return (
    <AppScreen name={t("casino_syndicate")}>
      <div className="MainScreen_content">
        <div className="MainScreen_header">
          {account &&
            <Button
              onClick={() => showModal(TableModal, {
                onSubmit: async (values) => {
                  await createTable(values)
                }
              })}
            >
              {t("create_table")}
            </Button>
          }
        </div>
        <div className="MainScreen_tables">
          {ownedTables.map((table) => (
            <TableCard
              key={table.address}
              table={table}
            />
          ))}
        </div>
      </div>
    </AppScreen>
  )
}

const TableCard = React.memo(({ table }) => {
  const { name, address } = table || {}
  return (
    <Card
      onClick={() => history.push(`/tables/${address}/admin`)}
      className="MainScreen_table"
    >
      <div className="MainScreen_table_name">{name}</div>
      <div className="MainScreen_table_address">{address}</div>
    </Card>
  )
})

export default MainScreen
