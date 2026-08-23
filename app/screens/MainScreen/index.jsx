import React from "react"
import AppScreen from "app/components/AppScreen"
import { useSelector } from "react-redux"
import { createTable, fetchTables, selectTables, TABLE_TYPES } from "app/core/tables"
import { Button, Text } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import AuthModal from "app/core/auth/AuthModal"
import history from "app/core/history"
import _ from "lodash"
import { cn, labelClass, titleClass } from "app/core"
import { selectAuth } from "app/core/auth"
import { selectRoulette } from "app/games/roulette"
import { selectPolygons } from "app/games/polygons"
import { bankrollClass, clampEth, ethLabel, MIN_BET, tableMaxBet } from "app/games/roulette/chips"
import { ethers } from "ethers"
import { selectNativeSymbol } from "app/core/chain"


const MainScreen = () => {
  const { account } = useSelector(() => selectAuth())
  const tables = useSelector(() => selectTables())

  React.useEffect(() => {
    fetchTables()
  }, [account])

  const ownedTables = _.filter(_.orderBy(Object.values(tables), ["createdAt"], ["desc"]), (table) => {
    const { createdBy } = table || {}
    return createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)
  })
  const isEmpty = _.isEmpty(ownedTables)
  const showHero = !account || isEmpty

  const openCreate = () => showModal(TableModal, {
    onSubmit: async (values) => {
      await createTable(values)
    }
  })

  return (
    <AppScreen>
      <div className={cn("main-screen", "mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3")}>
        {showHero &&
          <div className={cn("main-hero", "flex min-h-0 flex-1 flex-col items-start justify-center")}>
            <div className={cn("main-hero-label", labelClass, "mb-3 inline-flex items-center gap-2")}>
              <span className={cn("main-hero-rule", "h-px w-8 bg-cs-accent")} />
              On-chain tables
            </div>
            <h1 className={cn("main-hero-title", titleClass, "mb-3 text-[clamp(1.75rem,8vw,2.75rem)] font-extrabold leading-[1.15]")}>
              Casino{" "}
              <span className={cn("main-hero-brand", "inline-block bg-linear-to-br from-cs-accent to-cs-accent-2 bg-clip-text text-transparent")}>
                Syndicate
              </span>
            </h1>
            <p className={cn("main-hero-copy", "mb-4 max-w-[36rem] text-[0.875rem] leading-normal text-cs-body")}>
              Create and fund tables from a wallet.
            </p>
            <div className={cn("main-hero-actions", "flex flex-wrap gap-2")}>
              {account &&
                <Button className={cn("main-create-table")} onClick={openCreate}>
                  Create table
                </Button>
              }
              {!account &&
                <Button className={cn("main-connect")} onClick={() => showModal(AuthModal)}>
                  Connect
                </Button>
              }
            </div>
          </div>
        }
        {account && !isEmpty &&
          <div className={cn("main-tables", "flex min-h-0 flex-1 flex-col overflow-hidden")}>
            <div className={cn("main-tables-header", "mb-3 flex shrink-0 items-end justify-between gap-3")}>
              <div className={cn("main-tables-heading")}>
                <div className={cn("main-tables-label", labelClass)}>01 — Tables</div>
                <h2 className={cn("main-tables-title", titleClass, "mt-1 mb-0 text-xl")}>Your tables</h2>
              </div>
              <Button
                className={cn("main-tables-create")}
                variant="outline"
                color="gray"
                onClick={openCreate}
              >
                Create
              </Button>
            </div>
            <div className={cn("main-tables-list", "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden")}>
              {_.map(ownedTables, (table, index) => (
                <TableCard
                  key={table.id}
                  table={table}
                  index={index}
                />
              ))}
            </div>
          </div>
        }
      </div>
    </AppScreen>
  )
}

const TableCard = React.memo(({ table, index }) => {
  const { address, type } = table || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const polygons = useSelector(() => selectPolygons(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
  const isPolygons = type === TABLE_TYPES.Polygons
  const { minBet, maxBet, totalBalance } = roulette
  const { claimedCount, polygonCount, ticketPrice, totalBalance: polygonsBalance } = polygons
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`
  const bankroll = clampEth(totalBalance)
  const polygonsBankroll = clampEth(polygonsBalance)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  let stats = roulette
  if (isPolygons) stats = polygons
  const hasStats = !_.isEmpty(stats)
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
      onClick={() => history.push(`/tables/${address}/admin`)}
    >
      <div className={cn("table-card-order", "text-[0.75rem] tracking-[0.1em] text-cs-accent")}>{order}</div>
      <div className={cn("table-card-body", "flex min-w-0 flex-1 flex-col gap-0.5")}>
        <h3 className={cn("table-card-type", titleClass, "m-0 truncate text-base")}>{type}</h3>
        <Text className={cn("table-card-address")} size="xs" c="dimmed">{shortAddress}</Text>
      </div>
      {hasStats && isPolygons &&
        <div className={cn("table-card-stats", "flex shrink-0 flex-col items-end gap-0.5 text-right")}>
          <span className={cn("table-card-bankroll", titleClass, "text-base", bankrollClass(polygonsBankroll, ticketPrice))}>
            {ethLabel(polygonsBankroll, symbol)}
          </span>
          <Text className={cn("table-card-limits")} size="xs" c="dimmed">
            {claimedCount || 0}/{polygonCount || 0}
          </Text>
        </div>
      }
      {hasStats && !isPolygons &&
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

export default MainScreen
