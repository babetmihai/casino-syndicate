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


const init = async () => {
  await loadStorage()
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Router history={history}>
        <Provider store={store}>
          <App />
        </Provider>
      </Router>
    </React.StrictMode>
  )
}

init()
