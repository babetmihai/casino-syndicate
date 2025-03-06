import React from "react"
import AppScreen from "app/components/AppScreen"
import { Button } from "@mantine/core"
import { Link } from "react-router-dom"


const DashboardScreen = () => {
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
