import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import { buyTableShares, selectRoulette, setRouletteLimits, withdrawTableShares } from "app/games/roulette"
import { clampEth, maxBetCap, MIN_BET, tableMaxBet } from "app/games/roulette/chips"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { fetchBalance, selectAuth } from "app/core/auth"
import { HandDepositIcon, HandWithdrawIcon, PencilSimpleIcon, PlayIcon, WalletIcon } from "@phosphor-icons/react"
import { AppFab } from "app/components/AppFabs"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import EditTableModal from "app/core/tables/EditTableModal"
import WithdrawModal from "app/core/tables/WithdrawModal"
import AuthModal from "app/core/auth/AuthModal"
import { ethers } from "ethers"
import "./index.scss"


const AdminScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth()) || {}
  const table = useSelector(() => selectTable(address))
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, minBet, maxBet, totalBalance } = roulette
  const { name, type, createdBy } = table || {}
  const hasShare = clampEth(memberShares) > 0
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  return (
    <AppScreen
      name={name || "Manage"}
      onBack={() => history.replace("/")}
      fabs={
        <>
          <AppFab
            label="Play"
            onClick={() => history.push(`/tables/${address}`)}
          >
            <PlayIcon size={24} />
          </AppFab>
          {isOwner &&
            <AppFab
              secondary
              label={t("edit_table")}
              onClick={() => {
                const bankroll = clampEth(totalBalance)
                const maxCap = maxBetCap(bankroll)
                let nextMax = tableMaxBet(maxBet, bankroll) || MIN_BET
                if (nextMax > maxCap) nextMax = maxCap || MIN_BET
                showModal(EditTableModal, {
                  minBet: clampEth(minBet) || MIN_BET,
                  maxBet: nextMax,
                  maxCap,
                  bankroll,
                  onSubmit: async (values) => {
                    await setRouletteLimits(address, values)
                  }
                })
              }}
            >
              <PencilSimpleIcon size={24} />
            </AppFab>
          }
          {account &&
            <AppFab
              secondary
              className="AdminScreen_deposit"
              label={t("fund_table")}
              onClick={() => showModal(DepositModal, {
                onSubmit: async ({ balance }) => {
                  await buyTableShares({ balance }, address)
                  await fetchBalance(account)
                }
              })}
            >
              <HandDepositIcon size={24} />
            </AppFab>
          }
          {!account &&
            <AppFab
              secondary
              label="Connect"
              onClick={() => showModal(AuthModal)}
            >
              <WalletIcon size={24} />
            </AppFab>
          }
          {hasShare &&
            <AppFab
              secondary
              className="AdminScreen_withdraw"
              label="Withdraw"
              onClick={() => showModal(WithdrawModal, {
                max: clampEth(memberShares),
                bankroll: clampEth(totalBalance),
                maxBet,
                onSubmit: async ({ balance }) => {
                  await withdrawTableShares({ balance }, address)
                  await fetchBalance(account)
                }
              })}
            >
              <HandWithdrawIcon size={24} />
            </AppFab>
          }
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
