import React from "react"
import { initTable, selectContract, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { useLoader } from "app/core/loaders"


const TableScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const contract = useSelector(() => selectContract(address))
  const loading = useLoader(address)

  React.useEffect(() => {
    if (address) initTable(address)
  }, [address])

  return (
    <AppScreen name={table.name} onBack={() => history.replace("/")} loading={loading}>
      {contract &&
        <TableResolver
          table={table}
          contract={contract}
          address={address}
        />
      }
    </AppScreen>
  )
}


const TableResolver = ({ table, ...props }) => {
  const { type } = table
  switch (type) {
    case (TABLE_TYPES.Roulette): return <RouletteAdmin table={table} {...props} />
    default: return null
  }
}

export default TableScreen
