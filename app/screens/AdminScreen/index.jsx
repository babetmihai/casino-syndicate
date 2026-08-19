import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import { buyTableShares, selectRoulette, withdrawTableShares } from "app/games/roulette"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { fetchBalance, selectAuth } from "app/core/auth"
import { CoinsIcon, HandWithdrawIcon, PlayIcon, WalletIcon } from "@phosphor-icons/react"
import { AppFab } from "app/components/AppFabs"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import WithdrawModal from "app/core/tables/WithdrawModal"
import AuthModal from "app/core/auth/AuthModal"


const AdminScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth()) || {}
  const table = useSelector(() => selectTable(address))
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares } = roulette
  const hasShare = (Number(memberShares) || 0) > 0

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { name, type } = table || {}

  return (
    <AppScreen
      name={name || "Manage"}
      onBack={() => history.replace("/")}
      fabs={
        <>
          {account &&
            <AppFab
              label={t("fund_table")}
              onClick={() => showModal(DepositModal, {
                onSubmit: async ({ balance }) => {
                  await buyTableShares({ balance }, address)
                  await fetchBalance(account)
                }
              })}
            >
              <CoinsIcon size={24} />
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
          {hasShare &&
            <AppFab
              secondary
              label="Withdraw"
              onClick={() => showModal(WithdrawModal, {
                max: Number(memberShares),
                onSubmit: async ({ balance }) => {
                  await withdrawTableShares({ balance }, address)
                  await fetchBalance(account)
                }
              })}
            >
              <HandWithdrawIcon size={24} />
            </AppFab>
          }
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
      {address && type === TABLE_TYPES.Roulette &&
        <RouletteAdmin address={address} />
      }
    </AppScreen>
  )
}

export default AdminScreen
