import React from "react"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import { Route, Switch } from "react-router-dom"
import MainScreen from "./screens/MainScreen"
import AppLayout from "./components/AppLayout"
import { MantineProvider } from "@mantine/core"
import AdminScreen from "./screens/AdminScreen"
import GameScreen from "./screens/GameScreen"


function App() {
  return (
    <MantineProvider withCssVariables>
      <AppLayout>
        <Switch>
          <Route path="/" exact component={MainScreen} />
          <Route path="/tables/:address/admin" component={AdminScreen} />
          <Route path="/tables/:address" component={GameScreen} />
        </Switch>
        <ModalDispatcher />
      </AppLayout>
    </MantineProvider>
  )
}

export default App