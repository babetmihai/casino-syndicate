import React from "react"
import { Route } from "react-router-dom"
import { useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { initTable, selectTable } from "app/core/tables"
import { Loader } from "@mantine/core"
import _ from "lodash"


const TableRoute = (props) => {
  const { address } = useParams()
  const table = useSelector(() => selectTable())

  React.useEffect(() => {
    initTable(address)
  }, [address])

  if (_.isEmpty(table)) return <Loader />
  return <Route {...props} />
}

export default TableRoute
