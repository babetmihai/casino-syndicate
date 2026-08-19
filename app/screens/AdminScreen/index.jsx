import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import { buyTableShares } from "app/games/roulette"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"
import { CoinsIcon, PlayIcon } from "@phosphor-icons/react"
import { AppFab } from "app/components/AppFabs"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"


const AdminScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth())
  const table = useSelector(() => selectTable(address))

  React.useEffect(() => {
    if (!address) return
    initTable(address).then(() => {
      const { createdBy } = selectTable(address) || {}
      if (!createdBy || !account) return
      if (ethers.getAddress(createdBy) !== ethers.getAddress(account)) {
        history.replace(`/tables/${address}`)
      }
    })
  }, [address, account])

  const { name, createdBy, type } = table || {}
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  return (
    <AppScreen
      name={name || "Manage"}
      onBack={() => history.replace("/")}
      fabs={isOwner &&
        <>
          <AppFab
            label={t("fund_table")}
            onClick={() => showModal(DepositModal, {
              onSubmit: async ({ balance }) => {
                await buyTableShares({ balance }, address)
              }
            })}
          >
            <CoinsIcon size={30} />
          </AppFab>
          <AppFab
            secondary
            label="Play"
            onClick={() => history.push(`/tables/${address}`)}
          >
            <PlayIcon size={24} />
          </AppFab>
        </>
      }
    >
      {address && isOwner && type === TABLE_TYPES.Roulette &&
        <RouletteAdmin address={address} />
      }
    </AppScreen>
  )
}

export default AdminScreen
