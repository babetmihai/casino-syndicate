import React from "react"
import { useSelector } from "react-redux"
import { hideModal, selectModals } from "."
import _ from "lodash"


export default function ModalDispatcher() {
  const modals = useSelector(() => selectModals())
  return (
    <>
      {_.map(modals, (modal) => {
        const { id, Component, props } = modal || {}
        const { onClose = hideModal } = props || {}
        if (!Component) return null
        return (
          <Component
            {...props}
            key={id}
            onClose={onClose}
          />
        )
      })}
    </>
  )
}
