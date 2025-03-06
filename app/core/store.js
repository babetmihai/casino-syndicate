import { applyMiddleware, compose } from "redux"
import { storageMiddleware } from "./storage"
import _ from "lodash"
import setWith from "lodash/fp/setWith"
import unset from "lodash/fp/unset"
import updateWith from "lodash/fp/updateWith"
import { legacy_createStore } from "redux"
import { EMPTY_OBJECT } from "."


const SET = "@@SET"
const UPDATE = "@@UPDATE"
const UNSET = "@@UNSET"


export const createStore = (middleware) => legacy_createStore(reducer, {}, middleware)
export const createActions = (store, basePath) => ({
  get: (...args) => {
    let _path
    let defaultValue = EMPTY_OBJECT
    if (args.length > 0) [_path, defaultValue] = args
    const path = join(basePath, _path)
    if (!path) return store.getState()
    return _.get(store.getState(), path, defaultValue)
  },
  set: (...args) => {
    let _path
    let [payload] = args
    if (args.length > 1) [_path, payload] = args
    const path = join(basePath, _path)
    store.dispatch({
      type: `Set ${stringify(path)}`,
      path,
      payload,
      method: SET
    })
  },
  update: (...args) => {
    let _path
    let [payload] = args
    if (args.length > 1) [_path, payload] = args
    const path = join(basePath, _path)
    store.dispatch({
      type: `Update ${stringify(path)}`,
      path,
      payload,
      method: UPDATE
    })
  },
  unset: (...args) => {
    const [_path] = args
    const path = join(basePath, _path)
    store.dispatch({
      type: `Unset ${stringify(path)}`,
      path,
      method: UNSET
    })
  },
  create: (path) => createActions(store, join(basePath, path))
})


const reducer = (state = {}, action) => {
  const { path, method, payload } = action
  switch (method) {
    case SET: {
      if (_.isNil(path)) return payload
      return setWith(Object, path, payload, state)
    }
    case UPDATE: {
      if (_.isNil(payload)) return state
      if (_.isNil(path)) {
        if (_.isFunction(payload)) return payload(state)
        if (_.isPlainObject(state) && _.isPlainObject(payload)) {
          return { ...state, ...payload }
        }
        return payload
      } else {
        if (_.isFunction(payload)) return updateWith(Object, path, payload, state)
        return updateWith(Object, path, (value) => {
          if (_.isPlainObject(value) && _.isPlainObject(payload)) {
            return { ...value, ...payload }
          } else {
            return payload
          }
        }, state)
      }
    }
    case UNSET: {
      if (_.isNil(path)) return {}
      return unset(path, state)
    }
    default: return state
  }
}


const join = (...args) => {
  const _path = args
    .filter(Boolean)
    .map((path) => {
      if (_.isString(path)) return path.split(".")
      return path
    })
    .flat()

  if (!_.isEmpty(_path)) return _path.join(".")
  return undefined
}


const stringify = (path) => _.castArray(path).filter(Boolean).join(".")


const devToolsComposer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
const composeEnhancers = devToolsComposer
  ? devToolsComposer({})
  : compose

const store = createStore(composeEnhancers(applyMiddleware(
  storageMiddleware
)))


export const actions = createActions(store)


export default store