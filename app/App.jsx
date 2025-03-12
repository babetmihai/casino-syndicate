import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import MainScreen from "./screens/MainScreen"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"
import TableScreen from "./screens/TableScreen"

function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" exact component={MainScreen} />
          <Route path="/tables/:address" component={TableScreen} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>
    </MantineProvider>
  )
}

export default App