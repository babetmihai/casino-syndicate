import React from "react"
import AppScreen from "app/components/AppScreen"
import { useSelector } from "react-redux"
import { createTable, fetchTables, selectTables } from "app/core/tables"
import { Button, Text } from "@mantine/core"
import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import AuthModal from "app/core/auth/AuthModal"
import history from "app/core/history"
import _ from "lodash"
import { cn, labelClass, titleClass } from "app/core"
import { selectAuth } from "app/core/auth"
import { selectRoulette } from "app/games/roulette"
import { clampEth, ethLabel, isTableLocked, MIN_BET, tableMaxBet } from "app/games/roulette/chips"
import { ethers } from "ethers"


const MainScreen = () => {
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
  const showHero = !account || isEmpty

  const openCreate = () => showModal(TableModal, {
    onSubmit: async (values) => {
      await createTable(values)
    }
  })

  return (
    <AppScreen>
      <div className="mx-auto flex min-h-0 w-full max-w-[42rem] flex-1 flex-col overflow-hidden px-3 py-3">
        {showHero &&
          <div className="flex min-h-0 flex-1 flex-col items-start justify-center">
            <div className={cn(labelClass, "mb-3 inline-flex items-center gap-2")}>
              <span className="h-px w-8 bg-cs-accent" />
              On-chain roulette
            </div>
            <h1 className={cn(titleClass, "mb-3 text-[clamp(1.75rem,8vw,2.75rem)] font-extrabold leading-[1.15]")}>
              Casino{" "}
              <span className="inline-block bg-linear-to-br from-cs-accent to-cs-accent-2 bg-clip-text text-transparent">
                Syndicate
              </span>
            </h1>
            <p className="mb-4 max-w-[36rem] text-[0.875rem] leading-normal text-cs-body">
              Create and fund tables from a wallet.
            </p>
            <div className="flex flex-wrap gap-2">
              {account &&
                <Button onClick={openCreate}>
                  Create table
                </Button>
              }
              {!account &&
                <Button onClick={() => showModal(AuthModal)}>
                  Connect
                </Button>
              }
            </div>
          </div>
        }
        {account && !isEmpty &&
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
              <div>
                <div className={labelClass}>01 — Tables</div>
                <h2 className={cn(titleClass, "mt-1 mb-0 text-xl")}>Your tables</h2>
              </div>
              <Button
                variant="outline"
                color="gray"
                onClick={openCreate}
              >
                Create
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              {ownedTables.map((table, index) => (
                <TableCard
                  key={table.address}
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
  const { name, address } = table || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const { memberShares, minBet, maxBet, totalBalance, locked } = roulette
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`
  const bankroll = clampEth(totalBalance)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet, bankroll)
  const tableLocked = locked || isTableLocked(bankroll, maxBet)
  const hasStats = !_.isEmpty(roulette)
  const order = String(index + 1).padStart(2, "0")

  return (
    <button
      type="button"
      className={cn(
        "group relative flex w-full shrink-0 appearance-none items-center gap-3 rounded-[0.75rem]",
        "border border-cs-border bg-cs-surface px-3 py-2.5 text-left font-sans text-inherit",
        "cursor-pointer transition-[border-color] duration-[250ms]",
        "hover:border-cs-border-hover"
      )}
      onClick={() => history.push(`/tables/${address}/admin`)}
    >
      <div className="text-[0.75rem] tracking-[0.1em] text-cs-accent">{order}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className={cn(titleClass, "m-0 truncate text-base")}>{name}</h3>
        <Text size="xs" c="dimmed">{shortAddress}</Text>
      </div>
      {hasStats &&
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className={cn(titleClass, "text-base text-cs-accent", tableLocked && "text-red-600")}>
            {ethLabel(memberShares)}
          </span>
          <Text size="xs" c="dimmed">
            {ethLabel(minBetAmount)}–{ethLabel(maxBetAmount)}
          </Text>
        </div>
      }
    </button>
  )
})

export default MainScreen
