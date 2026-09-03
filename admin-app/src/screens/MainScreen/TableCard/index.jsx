import React from "react"
import { Text } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectRoulette } from "app/games/roulette"
import { bankrollClass, clampEth, ethLabel, MIN_BET, tableMaxBet } from "app/games/roulette/chips"
import { selectNativeSymbol } from "app/core/chain"
import { cn, titleClass } from "app/core"
import { openTable } from "./actions"
import _ from "lodash"


const TableCard = React.memo(({ table, index }) => {
  const { address, type } = table || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const { minBet, maxBet, totalBalance } = roulette
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`
  const bankroll = clampEth(totalBalance)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  const hasStats = !_.isEmpty(roulette)
  const order = String(index + 1).padStart(2, "0")

  return (
    <button
      type="button"
      className={cn(
        "table-card",
        "group relative flex w-full shrink-0 appearance-none items-center gap-3 rounded-[0.75rem]",
        "border border-cs-border bg-cs-surface px-3 py-2.5 text-left font-sans text-inherit",
        "cursor-pointer transition-[border-color,transform] duration-[250ms]",
        "hover:border-cs-border-hover active:scale-[0.99]"
      )}
      onClick={() => openTable(address)}
    >
      <div className={cn("table-card-order", "text-[0.75rem] tracking-[0.1em] text-cs-accent")}>{order}</div>
      <div className={cn("table-card-body", "flex min-w-0 flex-1 flex-col gap-0.5")}>
        <h3 className={cn("table-card-type", titleClass, "m-0 truncate text-base")}>{type}</h3>
        <Text className={cn("table-card-address")} size="xs" c="dimmed">{shortAddress}</Text>
      </div>
      {hasStats &&
        <div className={cn("table-card-stats", "flex shrink-0 flex-col items-end gap-0.5 text-right")}>
          <span className={cn("table-card-bankroll", titleClass, "text-base", bankrollClass(bankroll, maxBet))}>
            {ethLabel(bankroll, symbol)}
          </span>
          <Text className={cn("table-card-limits")} size="xs" c="dimmed">
            {ethLabel(minBetAmount, symbol)}–{ethLabel(maxBetAmount, symbol)}
          </Text>
        </div>
      }
    </button>
  )
})

export default TableCard
