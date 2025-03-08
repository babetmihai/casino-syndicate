import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button } from "@mantine/core"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectWallet } from "app/core/wallet"


const DashboardScreen = () => {
  const { contract, account } = useSelector(() => selectWallet())

  React.useEffect(() => {
    if (contract && account) {
      const init = async () => {
        console.log("init")
        try {
          const balance = await contract.getContractBalance()
          console.log("Balance:", balance)
        } catch (error) {
          console.error("Failed to fetch balance:", error)
        }
      }
      init()
    }

  }, [contract, account])
  return (
    <AppScreen name="Dashboard">
      <div>
        <h1></h1>
      </div>
      <Link to="/tables">
        <Button>
          Tables
        </Button>
      </Link>

    </AppScreen>
  )
}

export default DashboardScreen
