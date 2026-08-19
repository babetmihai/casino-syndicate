import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { name, type } = table || {}

  return (
    <AppScreen name={name}>
      {type === TABLE_TYPES.Roulette &&
        <RouletteGame address={address} />
      }
    </AppScreen>
  )
}

export default GameScreen
