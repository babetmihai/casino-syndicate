import React from "react"
import { Route } from "react-router-dom"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectContract, initTable } from "app/core/tables"
import { Loader } from "@mantine/core"

const TableRoute = (props) => {
  const { address } = useParams()
  const contract = useSelector(() => selectContract(address))

  React.useEffect(() => {
    initTable(address)
  }, [])

  if (!contract) return <Loader />
  return <Route {...props} />
}

export default TableRoute
