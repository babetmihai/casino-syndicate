import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

import "@mantine/core/styles.css"
import "./index.css"
import { Provider } from "react-redux"
import store from "./core/store"
import { loadStorage } from "./core/storage"


const init = async () => {
  await loadStorage()
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  )
}

init()
