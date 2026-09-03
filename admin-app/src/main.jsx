import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { Router } from "react-router-dom"
import { MantineProvider } from "@mantine/core"
import App from "./App"
import store from "./core/store"
import { loadStorage } from "./core/store/storage"
import history from "./core/history"
import { initChain } from "./core/chain"
import { loadLanguage } from "./core/i18n"
import { watchWallet } from "./core/auth"
import { theme } from "./theme"


void loadStorage()
  .then(() => {
    initChain()
    return loadLanguage()
  })
  .then(() => {
    watchWallet()
    ReactDOM.createRoot(document.getElementById("root")).render(
      <Router history={history}>
        <Provider store={store}>
          <MantineProvider
            theme={theme}
            forceColorScheme="dark"
            withCssVariables
          >
            <App />
          </MantineProvider>
        </Provider>
      </Router>
    )
  })
