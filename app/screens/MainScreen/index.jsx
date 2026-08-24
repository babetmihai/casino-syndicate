import React from "react"
import AppScreen from "app/components/AppScreen"
import { useSelector } from "react-redux"
import { fetchTables, selectTables } from "app/core/tables"
import { Button } from "@mantine/core"
import { cn, labelClass, titleClass } from "app/core"
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"
import TableCard from "./TableCard"
import { openConnect, openCreate } from "./actions"
import _ from "lodash"


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
                <Button className={cn("main-connect")} onClick={openConnect}>
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

export default MainScreen
