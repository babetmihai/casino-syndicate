import React from "react"
import { actions } from "../store"
import { EMPTY_ARRAY, EMPTY_OBJECT } from "../"


export const selectModals = () => actions.get("modals", EMPTY_ARRAY)
export const showModal = (Component, props) => actions.update("modals", (modals = []) => {
  return [...modals, { Component, props }]
})
export const hideModal = () => actions.update("modals", (modals = []) => modals.slice(0, -1))


export const ModalContext = React.createContext(EMPTY_OBJECT)

