import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import "./index.scss"
import { useSelector } from "react-redux"
import { createTable, fetchTables, selectTables } from "app/core/tables"
import { Button, Card, Text } from "@mantine/core"
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
  const isEmpty = ownedTables.length === 0

  const openCreate = () => showModal(TableModal, {
    onSubmit: async (values) => {
      await createTable(values)
    }
  })

  return (
    <AppScreen
      name={t("casino_syndicate")}
      actions={account && (
        <Button onClick={openCreate}>
          {t("create_table")}
        </Button>
      )}
    >
      <div className="MainScreen_content">
        {!account &&
          <Text c="dimmed" ta="center" py="xl">
            Connect a wallet to create and manage tables.
          </Text>
        }
        {account && isEmpty &&
          <div className="MainScreen_empty">
            <Text c="dimmed" ta="center">
              No tables yet.
            </Text>
            <Button onClick={openCreate}>
              {t("create_table")}
            </Button>
          </div>
        }
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
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`

  return (
    <Card
      className="MainScreen_table"
      onClick={() => history.push(`/tables/${address}`)}
    >
      <div className="MainScreen_table_info">
        <Text fw={500}>{name}</Text>
        <Text size="sm" c="dimmed">{shortAddress}</Text>
      </div>
      <Button
        variant="subtle"
        onClick={(event) => {
          event.stopPropagation()
          history.push(`/tables/${address}/admin`)
        }}
      >
        Manage
      </Button>
    </Card>
  )
})

export default MainScreen
