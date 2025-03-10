import "@mantine/core/styles.css"
import "./index.scss"

import React from "react"
import { initWallet, selectWallet } from "./core/wallet"
import ReactDOM from "react-dom/client"
import App from "./App"
import { Provider } from "react-redux"
import store from "./core/store"
import { loadStorage } from "./core/storage"
import { Router } from "react-router-dom"
import history from "./core/history"

import { loadLanguage } from "./core/i18n"


const init = async () => {
  await loadStorage()
  await loadLanguage()
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
