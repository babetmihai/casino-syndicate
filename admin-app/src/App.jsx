import React from "react"
import { Route, Switch } from "react-router-dom"
import ModalDispatcher from "./core/modals/ModalDispatcher"
import AppLayout from "./components/AppLayout"
import MainScreen from "./screens/MainScreen"
import AdminScreen from "./screens/AdminScreen"


const App = () => {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" exact component={MainScreen} />
        <Route path="/tables/:address" component={AdminScreen} />
      </Switch>
      <ModalDispatcher />
    </AppLayout>
  )
}

export default App
