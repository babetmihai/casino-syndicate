import React from "react"
import { Loader } from "@mantine/core"
import { initTable, selectContract, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import RouletteScreen from "app/games/roulette/RouletteScreen"


const TableScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const contract = useSelector(() => selectContract(address))

  React.useEffect(() => {
    if (address) initTable(address)
  }, [address])


  if (!contract) return <Loader />
  const { type } = table
  switch (type) {
    case (TABLE_TYPES.Roulette): return <RouletteScreen contract={contract} table={table} key={address} />
    default: return <Loader />
  }
}

export default TableScreen
