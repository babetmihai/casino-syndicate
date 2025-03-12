import client from "../client"
import { actions } from "../store"
import { useSelector } from "react-redux"
import React from "react"
import { EMPTY_OBJECT } from ".."
import _ from "lodash"
import { selectContract } from "../wallet"
import { ethers } from "ethers"


export const selectTable = (id) => actions.get(`tables.${id}`, EMPTY_OBJECT)
export const selectTables = () => actions.get("tables", EMPTY_OBJECT)


export const useTable = (id) => {
  const table = useSelector(() => selectTable(id))
  React.useEffect(() => {
    if (id && _.isEmpty(table)) fetchTable(id)
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

export const selectTableData = (id) => actions.get(`tableData.${id}`, EMPTY_OBJECT)
export const fetchTableData = async (id) => {
  const table = selectTable(id)
  const { address } = table
  const contract = selectContract(address)
  const data = await contract.getTable()
  const TABLE_DATA_FIELDS = ["memberShares", "playerBalance", "totalBalance", "totalShares"]
  const formattedData = TABLE_DATA_FIELDS.reduce((acc, field) => {
    acc[field] = ethers.formatEther(data[field])
    return acc
  }, {})
  actions.set(`tableData.${id}`, formattedData)
  return formattedData
}
