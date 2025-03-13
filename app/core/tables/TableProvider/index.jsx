import React from "react"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectTable, selectContract, initTable } from "app/core/tables"


const TableProvider = ({ children }) => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const contract = useSelector(() => selectContract(address))
  React.useEffect(() => {
    if (address) initTable(address)
  }, [address])

  return children({ table, contract })
}


export default TableProvider