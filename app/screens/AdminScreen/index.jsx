import React from "react"
import { initTable, selectTable, setTableName, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import { buyTableShares, selectRoulette, setRouletteLimits, withdrawTableShares } from "app/games/roulette"
import { clampEth, MIN_BET, tableMaxBet } from "app/games/roulette/chips"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { fetchBalance, selectAuth } from "app/core/auth"
import { cn, labelClass, titleClass } from "app/core"
import { Button } from "@mantine/core"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import EditTableModal from "app/core/tables/EditTableModal"
import WithdrawModal from "app/core/tables/WithdrawModal"
import { ethers } from "ethers"


const AdminScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth()) || {}
  const table = useSelector(() => selectTable(address))
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, minBet, maxBet, lastWithdrawAt } = roulette
  const { name, type, createdBy } = table || {}
  const hasShare = clampEth(memberShares) > 0
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const openEdit = () => {
    const nextMax = tableMaxBet(maxBet)
    showModal(EditTableModal, {
      name: name || "",
      minBet: clampEth(minBet) || MIN_BET,
      maxBet: nextMax,
      onSubmit: async (values) => {
        const { name: nextName, minBet: nextMin, maxBet: nextMaxBet } = values
        if (nextName !== name) await setTableName(address, nextName)
        const limitsChanged = nextMin !== (clampEth(minBet) || MIN_BET) || nextMaxBet !== nextMax
        if (limitsChanged) {
          await setRouletteLimits(address, {
            minBet: nextMin,
            maxBet: nextMaxBet
          })
        }
      }
    })
  }

  const openDeposit = () => showModal(DepositModal, {
    onSubmit: async ({ balance }) => {
      await buyTableShares({ balance }, address)
      await fetchBalance(account)
    }
  })

  const openWithdraw = () => showModal(WithdrawModal, {
    max: clampEth(memberShares),
    lastWithdrawAt,
    onSubmit: async ({ balance }) => {
      await withdrawTableShares({ balance }, address)
      await fetchBalance(account)
    }
  })

  return (
    <AppScreen>
      <div className={cn("admin-screen", "mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3")}>
        <div className={cn("admin-label", labelClass)}>Table</div>
        <h1 className={cn("admin-title", titleClass, "mt-1 mb-3 truncate text-xl")}>
          {name || "Manage"}
        </h1>
        <div className={cn("admin-actions", "mb-3 flex shrink-0 flex-wrap gap-2")}>
          <Button className={cn("admin-play")} onClick={() => history.push(`/tables/${address}`)}>
            Play
          </Button>
          {isOwner &&
            <Button
              className={cn("admin-edit")}
              variant="outline"
              color="gray"
              onClick={openEdit}
            >
              {t("edit_table")}
            </Button>
          }
          {account &&
            <Button
              className={cn("admin-deposit")}
              variant="outline"
              color="gray"
              onClick={openDeposit}
            >
              {t("fund_table")}
            </Button>
          }
          {hasShare &&
            <Button
              className={cn("admin-withdraw")}
              variant="outline"
              color="gray"
              onClick={openWithdraw}
            >
              Withdraw
            </Button>
          }
        </div>
        {address && type === TABLE_TYPES.Roulette &&
          <RouletteAdmin address={address} />
        }
      </div>
    </AppScreen>
  )
}

export default AdminScreen
