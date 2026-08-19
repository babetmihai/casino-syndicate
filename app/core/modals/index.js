import { actions } from "../store"
import { EMPTY_ARRAY } from "../"


export const selectModals = () => actions.get("modals", EMPTY_ARRAY)
export const showModal = (Component, props) => actions.update("modals", (modals = []) => {
  return [...modals, { Component, props }]
})
export const hideModal = () => actions.update("modals", (modals = []) => modals.slice(0, -1))
