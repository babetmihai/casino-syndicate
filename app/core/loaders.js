import { useSelector } from "react-redux"
import { actions } from "app/core/store"


export const useLoader = (path) => useSelector(() => selectLoader(path))

export const selectLoader = (path) => actions.get(`loaders.${path}`, 0) > 0
export const setLoader = (path) => actions.update(`loaders.${path}`, (loader = 0) => loader + 1)
export const clearLoader = (path) => actions.update(`loaders.${path}`, (loader = 0) => loader - 1)

