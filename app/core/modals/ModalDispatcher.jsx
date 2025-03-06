import React from "react"
import { useSelector } from "react-redux"
import { hideModal, selectModals } from "."


export default function ModalDispatcher() {
  const modals = useSelector(() => selectModals())
  return (
    <>
      {modals.map((modal, index) => {
        const { Component, props } = modal || {}
        const { onClose = hideModal } = props || {}
        if (!Component) return null
        return (
          <Component
            {...props}
            key={index}
            onClose={onClose}
          />
        )
      })}
    </>
  )

}

