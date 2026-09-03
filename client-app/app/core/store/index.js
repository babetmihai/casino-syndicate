import { applyMiddleware, compose } from "redux"
import { StateActions, createStore } from "./utils"
import { storageMiddleware } from "./storage"


const devToolsComposer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
const composeEnhancers = devToolsComposer
  ? devToolsComposer({})
  : compose

const store = createStore(composeEnhancers(applyMiddleware(
  storageMiddleware
)))


export const actions = new StateActions(store)

export default store
