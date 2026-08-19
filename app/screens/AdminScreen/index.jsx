import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import RouletteAdmin from "app/games/roulette/RouletteAdmin"
import AppScreen from "app/components/AppScreen"
import history from "app/core/history"
import { selectAuth } from "app/core/auth"
import { ethers } from "ethers"


const AdminScreen = () => {
  const { address } = useParams()
  const { account } = useSelector(() => selectAuth())
  const table = useSelector(() => selectTable(address))

  React.useEffect(() => {
    if (!address) return
    initTable(address).then(() => {
      const { createdBy } = selectTable(address) || {}
      if (!createdBy || !account) return
      if (ethers.getAddress(createdBy) !== ethers.getAddress(account)) {
        history.replace(`/tables/${address}`)
      }
    })
  }, [address, account])

  const { name, createdBy, type } = table || {}
  const isOwner = createdBy && account && ethers.getAddress(createdBy) === ethers.getAddress(account)

  return (
    <AppScreen
      name={name}
      onBack={() => history.replace("/")}
    >
      {address && isOwner && type === TABLE_TYPES.Roulette &&
        <RouletteAdmin address={address} />
      }
    </AppScreen>
  )
}

export default AdminScreen
