import client from "../client"
import { actions } from "../store"
import { useSelector } from "react-redux"
import React from "react"
import { EMPTY_OBJECT } from ".."


export const selectTable = (id) => actions.get(`tables.${id}`)
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const useTable = (id) => {
  const table = useSelector(() => selectTable(id))
  React.useEffect(() => {
    if (id && !table) fetchTable(id)
  }, [id])
  return [table]
}

const fetchTable = async (id) => {
  const { data } = await client.get(`/tables/${id}`)
  actions.set(`tables.${data.id}`, data)
  return data
}

export const fetchTables = async () => {
  const { data } = await client.get("/tables")
  const tables = data.reduce((acc, table) => {
    acc[table.id] = table
    return acc
  }, {})
  actions.set("tables", tables)
  return tables
}

export const createTable = async (values) => {
  const { data } = await client.post("/tables", values)
  actions.set(`tables.${data.id}`, data)
  return data
}
