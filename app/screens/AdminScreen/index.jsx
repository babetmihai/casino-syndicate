import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { useLoader } from "app/core/loaders"
import { selectAuth } from "app/core/auth"


const AdminScreen = () => {
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth())
  const table = useSelector(() => selectTable(address))
  const loading = useLoader(address)

  React.useEffect(() => {
    if (address) initTable(address)
      .then(({ createdBy }) => {
        if (createdBy !== account) {
          history.replace(`/tables/${address}`)
        }
      })
  }, [address])


  const { name, createdBy } = table
  return (
    <AppScreen name={name} onBack={() => history.replace("/")} loading={loading}>
      {address && createdBy === account &&
        <Resolver
          table={table}
          address={address}
        />
      }
    </AppScreen>
  )
}


const Resolver = ({ table, ...props }) => {
  const { type } = table
  switch (type) {
    case (TABLE_TYPES.Roulette): return <RouletteAdmin table={table} {...props} />
    default: return null
  }
}

export default AdminScreen
