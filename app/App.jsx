import React from "react"
import { MantineProvider } from "@mantine/core"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectAccount } from "./core/wallet"
import DashboardScreen from "./screens/Dashboard"
import LoginScreen from "./screens/LoginScreen"


function App() {
  const account = useSelector(() => selectAccount())
  return (
    <MantineProvider>
      <Switch> 
        {!account && <Route component={LoginScreen} />}
        <Route path="/" component={DashboardScreen} />
      </Switch>
      <ModalDispatcher />
    </MantineProvider>
  )
}

export default App