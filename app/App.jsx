import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import MainScreen from "./screens/MainScreen"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"
import ContractScreen from "./screens/ContractScreen"

function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" exact component={MainScreen} />
          <Route path="/contracts/:address" component={ContractScreen} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>
    </MantineProvider>
  )
}

export default App