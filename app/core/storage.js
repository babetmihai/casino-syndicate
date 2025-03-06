import localforage from "localforage"
import { actions } from "./store"
import _ from "lodash"

const VERSION = 1
const PERSISTENT_PATHS = [
  "wallet"
]

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "casino_syndicate",
  storeName: "persistent_state",
  version: VERSION
})


export const storageMiddleware = (store) => (next) => (action) => {
  const prevState = store.getState()
  next(action)
  const state = store.getState()

  for (const path of PERSISTENT_PATHS) {
    const value = _.get(state, path)
    const prevValue = _.get(prevState, path)
    if (value !== prevValue) {
      localforage.setItem(path, value)
    }
  }
}

export const loadStorage = async () => {
  const acc = {}
  for (const path of PERSISTENT_PATHS) {
    await localforage.getItem(path)
      .then((value) => {
        _.setWith(acc, path, _.defaultTo(value, undefined), Object)
      })
      .catch(_.noop)
  }
  actions.set(acc)
}

export default localforage