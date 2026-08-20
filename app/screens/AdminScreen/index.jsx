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
  const { memberShares, minBet, maxBet, totalBalance } = roulette
  const { name, type, createdBy } = table || {}
  const hasShare = clampEth(memberShares) > 0
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const openEdit = () => {
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
  }

  const openDeposit = () => showModal(DepositModal, {
    onSubmit: async ({ balance }) => {
      await buyTableShares({ balance }, address)
      await fetchBalance(account)
    }
  })

  const openWithdraw = () => showModal(WithdrawModal, {
    max: clampEth(memberShares),
    bankroll: clampEth(totalBalance),
    maxBet,
    onSubmit: async ({ balance }) => {
      await withdrawTableShares({ balance }, address)
      await fetchBalance(account)
    }
  })

  return (
    <AppScreen>
      <div className="mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3">
        <div className={labelClass}>Table</div>
        <h1 className={cn(titleClass, "mt-1 mb-3 truncate text-xl")}>
          {name || "Manage"}
        </h1>
        <div className="mb-3 flex shrink-0 flex-wrap gap-2">
          <Button onClick={() => history.push(`/tables/${address}`)}>
            Play
          </Button>
          {isOwner &&
            <Button
              variant="outline"
              color="gray"
              onClick={openEdit}
            >
              {t("edit_table")}
            </Button>
          }
          {account &&
            <Button
              variant="outline"
              color="gray"
              onClick={openDeposit}
            >
              {t("fund_table")}
            </Button>
          }
          {hasShare &&
            <Button
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
