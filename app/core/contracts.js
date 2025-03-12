import { client } from "./client"
import { actions } from "../store"


export const selectContract = (address) => actions.get(`contracts.${address}`)

export const getContracts = async () => {
  const { data } = await client.get("/contracts")
  const contracts = data.reduce((acc, contract) => {
    acc[contract.address] = contract
    return acc
  }, {})
  actions.set("contracts", contracts)
  return contracts
}