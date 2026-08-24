import { useSelector } from "react-redux"
import { actions } from "./store"

const loaderActions = actions.create("loaders")


export const useLoader = (path) => useSelector(() => selectLoader(path))

export const selectLoader = (path) => loaderActions.get(path, 0) > 0

export const setLoader = (path) => loaderActions.update(path, (count = 0) => count + 1)

export const clearLoader = (path) => loaderActions.unset(path)
