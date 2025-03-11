import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import DashboardScreen from "./screens/Dashboard"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"


function App() {
  return (
    <MantineProvider
      defaultColorScheme="dark"
    >
      <AppLayout>
        <Switch>
          <Route path="/" component={DashboardScreen} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>
    </MantineProvider>
  )
}

export default App