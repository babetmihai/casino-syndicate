import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"
import { cn } from "app/core"
import { useLoader } from "app/core/loaders"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const loading = useLoader(address)
  const { type } = table || {}
  const missing = address && !loading && !type

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  return (
    <AppScreen>
      <div className={cn("game-screen", "flex min-h-0 flex-1 flex-col overflow-hidden")}>
        {missing &&
          <div className={cn("game-missing", "m-auto px-3 text-center text-[0.75rem] text-cs-muted")}>
            Table not found
          </div>
        }
        {type === TABLE_TYPES.Roulette &&
          <RouletteGame address={address} />
        }
      </div>
    </AppScreen>
  )
}

export default GameScreen
