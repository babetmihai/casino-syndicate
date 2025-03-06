import React from "react"
import { MantineProvider } from "@mantine/core"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import DashboardScreen from "./screens/Dashboard"
import TableList from "./screens/TableList"
import TableView from "./screens/TableView"
import AppLayout from "./components/AppLayout"


function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" component={DashboardScreen} />
          <Route path="/tables" component={TableList} />
          <Route path="/tables/:id" component={TableView} />
        </Switch>
      </AppLayout>
      <ModalDispatcher />
    </MantineProvider>
  )
}

export default App