import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import DashboardScreen from "./screens/Dashboard"
import TableList from "./screens/TableList"
import TableView from "./screens/TableView"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"


function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" exact component={DashboardScreen} />
          <Route path="/tables" exact component={TableList} />
          <Route path="/tables/:id" component={TableView} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>
    </MantineProvider>
  )
}

export default App