import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import { useLoader } from "app/core/loaders"
import RouletteGame from "app/games/roulette/RouletteGame"
import { useSocket } from "app/core/socket"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const loading = useLoader(address)

  React.useEffect(() => {
    if (address) initTable(address)
  }, [address])

  const { name } = table

  useSocket(address, () => {

  })

  return (
    <AppScreen
      name={name}
      loading={loading}
    >
      <Resolver
        table={table}
        address={address}
      />
    </AppScreen>
  )
}


const Resolver = ({ table, ...props }) => {
  const { type } = table
  switch (type) {
    case (TABLE_TYPES.Roulette): return <RouletteGame table={table} {...props} />
    default: return null
  }
}

export default GameScreen
