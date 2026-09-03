import { actions } from "../store"
import _ from "lodash"

let modalSeq = 0
const modalActions = actions.create("modals")


export const selectModals = () => modalActions.get()

export const showModal = (Component, props) => {
  modalSeq += 1
  const id = String(modalSeq)
  modalActions.set(id, { id, Component, props })
}

export const hideModal = () => {
  const last = _.last(Object.values(selectModals()))
  if (!last) return
  modalActions.unset(last.id)
}
