import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import { selectRoulette } from "app/games/roulette"
import { clampEth } from "app/games/roulette/chips"
import AppScreen from "app/components/AppScreen"
import { cn, labelClass, titleClass } from "app/core"
import { Button } from "@mantine/core"
import { openWithdraw } from "./actions"


const AdminScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, lastWithdrawAt } = roulette
  const { type } = table || {}
  const isRoulette = type === TABLE_TYPES.Roulette
  const shareAmount = memberShares
  const withdrawAt = lastWithdrawAt
  const hasShare = clampEth(shareAmount) > 0

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  return (
    <AppScreen>
      <div className={cn("admin-screen", "mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3")}>
        <div className={cn("admin-label", labelClass)}>Table</div>
        <h1 className={cn("admin-title", titleClass, "mt-1 mb-3 truncate text-xl")}>
          {type || "Manage"}
        </h1>
        {hasShare &&
          <div className={cn("admin-actions", "mb-3 flex shrink-0 flex-wrap gap-2")}>
            <Button
              className={cn("admin-withdraw")}
              variant="outline"
              color="gray"
              onClick={() => openWithdraw(address, shareAmount, withdrawAt)}
            >
              Withdraw
            </Button>
          </div>
        }
        {address && isRoulette &&
          <RouletteAdmin address={address} />
        }
      </div>
    </AppScreen>
  )
}

export default AdminScreen
