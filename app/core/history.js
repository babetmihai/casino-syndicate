import { createHashHistory } from "history"
import { useLocation } from "react-router-dom"
import qs from "qs"
import React from "react"
import _ from "lodash"


const history = createHashHistory()

export const useSearch = () => {
  const { search = "" } = useLocation()
  const state = React.useMemo(() => qs.parse(search, { ignoreQueryPrefix: true }), [search])

  return _.mapValues(state, (value, key) => {
    if (key.includes("search")) return value
    switch (value) {
      case ("true"): return true
      case ("false"): return false
      default: return value
    }
  })
}


export const getSearch = () => {
  return qs.parse(history.location.search, { ignoreQueryPrefix: true }) || {}
}

export default history