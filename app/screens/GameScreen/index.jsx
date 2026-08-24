import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"
import { cn } from "app/core"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { type } = table || {}

  return (
    <AppScreen>
      <div className={cn("game-screen", "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        {type === TABLE_TYPES.Roulette &&
          <RouletteGame address={address} />
        }
      </div>
    </AppScreen>
  )
}

export default GameScreen
