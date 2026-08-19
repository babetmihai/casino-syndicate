import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"
import history from "app/core/history"
import { Button } from "@mantine/core"
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const { account } = useSelector(() => selectAuth())

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { name, type, createdBy } = table || {}
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  return (
    <AppScreen
      name={name || "Table"}
      onBack={() => history.replace("/")}
      actions={isOwner && (
        <Button
          variant="subtle"
          onClick={() => history.push(`/tables/${address}/admin`)}
        >
          Manage
        </Button>
      )}
    >
      {type === TABLE_TYPES.Roulette &&
        <RouletteGame address={address} />
      }
    </AppScreen>
  )
}

export default GameScreen
