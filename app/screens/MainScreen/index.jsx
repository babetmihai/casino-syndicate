import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import "./index.scss"
import { useSelector } from "react-redux"
import { createTable, fetchTables, selectTables } from "app/core/tables"
import { Card, Text } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import AuthModal from "app/core/auth/AuthModal"
import history from "app/core/history"
import _ from "lodash"
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"
import { PlusIcon, PokerChipIcon, WalletIcon } from "@phosphor-icons/react"
import { AppFab } from "app/components/AppFabs"


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
      fabs={
        <>
          {account &&
            <AppFab
              label={t("create_table")}
              onClick={openCreate}
            >
              <PlusIcon size={24} />
            </AppFab>
          }
          {!account &&
            <AppFab
              label="Connect"
              onClick={() => showModal(AuthModal)}
            >
              <WalletIcon size={24} />
            </AppFab>
          }
        </>
      }
    >
      <div className="MainScreen_content">
        {!account &&
          <div className="MainScreen_empty">
            <div className="MainScreen_empty_icon">
              <WalletIcon size={32} />
            </div>
            <Text fw={500} size="lg">Connect a wallet</Text>
            <Text c="dimmed" size="sm">
              Connect to create and manage tables.
            </Text>
          </div>
        }
        {account && isEmpty &&
          <div className="MainScreen_empty">
            <div className="MainScreen_empty_icon">
              <PokerChipIcon size={32} />
            </div>
            <Text fw={500} size="lg">No tables yet</Text>
            <Text c="dimmed" size="sm">
              Create a table to start hosting games.
            </Text>
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
      onClick={() => history.push(`/tables/${address}/admin`)}
    >
      <div className="MainScreen_table_info">
        <Text fw={500}>{name}</Text>
        <Text size="sm" c="dimmed">{shortAddress}</Text>
      </div>
    </Card>
  )
})

export default MainScreen
