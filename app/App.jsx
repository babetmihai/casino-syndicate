import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import DashboardScreen from "./screens/Dashboard"
import TableList from "./screens/TableList"
import TableView from "./screens/TableView"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAccount } from "app/core/wallet"
import contracts from "app/core/contracts"

function App() {
  const account = useSelector(() => selectAccount())
  React.useEffect(() => {
    if (account) contracts.init()
  }, [account])
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" exact component={DashboardScreen} />
          <Route path="/tables" component={TableList} />
          <Route path="/tables/:id" component={TableView} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>

    </MantineProvider>
  )
}

export default App