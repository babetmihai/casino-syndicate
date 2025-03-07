import "@mantine/core/styles.css"
import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { Provider } from "react-redux"
import store from "./core/store"
import { loadStorage } from "./core/storage"
import { Router } from "react-router-dom"
import history from "./core/history"
import { initWallet, selectWallet } from "./core/wallet"

const init = async () => {
  await loadStorage()
  const { account } = selectWallet()
  if (account) await initWallet()

  ReactDOM.createRoot(document.getElementById("root")).render(
    <Router history={history}>
      <Provider store={store}>
        <App />
      </Provider>
    </Router>
  )
}

init()
