import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import LotteryAdmin from "app/games/lottery/LotteryAdmin"
import { buyTableShares, selectRoulette, withdrawTableShares } from "app/games/roulette"
import { depositLotteryShares, selectLottery, withdrawLotteryShares } from "app/games/lottery"
import { clampEth } from "app/games/roulette/chips"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { selectAuth } from "app/core/auth"
import { cn, labelClass, titleClass } from "app/core"
import { Button } from "@mantine/core"
import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import WithdrawModal from "app/core/tables/WithdrawModal"


const AdminScreen = () => {
  const { t } = useTranslation()
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth()) || {}
  const table = useSelector(() => selectTable(address))
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const lottery = useSelector(() => selectLottery(address)) || {}
  const { memberShares, lastWithdrawAt } = roulette
  const lotteryShares = lottery.memberShares
  const lotteryWithdrawAt = lottery.lastWithdrawAt
  const { type } = table || {}
  const isRoulette = type === TABLE_TYPES.Roulette
  const isPolygons = type === TABLE_TYPES.Polygons
  const shareAmount = isPolygons ? lotteryShares : memberShares
  const withdrawAt = isPolygons ? lotteryWithdrawAt : lastWithdrawAt
  const hasShare = clampEth(shareAmount) > 0

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const openDeposit = () => {
    showModal(DepositModal, {
      onSubmit: async ({ balance }) => {
        if (isPolygons) {
          await depositLotteryShares({ balance }, address)
        } else {
          await buyTableShares({ balance }, address)
        }
      }
    })
  }

  const openWithdraw = () => {
    showModal(WithdrawModal, {
      max: clampEth(shareAmount),
      lastWithdrawAt: withdrawAt,
      onSubmit: async ({ balance }) => {
        if (isPolygons) {
          await withdrawLotteryShares({ balance }, address)
        } else {
          await withdrawTableShares({ balance }, address)
        }
      }
    })
  }

  return (
    <AppScreen>
      <div className={cn("admin-screen", "mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3")}>
        <div className={cn("admin-label", labelClass)}>Table</div>
        <h1 className={cn("admin-title", titleClass, "mt-1 mb-3 truncate text-xl")}>
          {type || "Manage"}
        </h1>
        <div className={cn("admin-actions", "mb-3 flex shrink-0 flex-wrap gap-2")}>
          <Button className={cn("admin-play")} onClick={() => history.push(`/tables/${address}`)}>
            Play
          </Button>
          {(isRoulette || isPolygons) && account &&
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
        {address && isRoulette &&
          <RouletteAdmin address={address} />
        }
        {address && isPolygons &&
          <LotteryAdmin address={address} />
        }
      </div>
    </AppScreen>
  )
}

export default AdminScreen
