import React from "react"
import { Route, Switch } from "react-router-dom"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import AppLayout from "./components/AppLayout"
import GameScreen from "./screens/GameScreen"


const App = () => {
  return (
    <AppLayout>
      <Switch>
        <Route path="/tables/:address" component={GameScreen} />
      </Switch>
      <ModalDispatcher />
    </AppLayout>
  )
}

export default App
