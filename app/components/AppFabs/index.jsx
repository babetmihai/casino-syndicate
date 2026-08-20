import React from "react"
import { createPortal } from "react-dom"
import "./index.scss"
import { ActionIcon, Tooltip } from "@mantine/core"


export const AppFabs = ({ children }) => {
  return createPortal(
    <div className="AppFabs_root">
      {children}
    </div>,
    document.body
  )
}

export const AppFab = ({ label, children, onClick, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture, secondary, selected, holding, disabled, loading, className, dataValue }) => {
  let variant = "filled"
  if (secondary) variant = "default"
  let fabClass = "AppFab_root"
  if (className) fabClass = `${fabClass} ${className}`
  const holdable = holding === true || holding === false

  return (
    <Tooltip
      label={label}
      position="left"
      withArrow
    >
      <ActionIcon
        className={fabClass}
        radius="xl"
        variant={variant}
        aria-label={label}
        aria-pressed={selected}
        data-selected={selected}
        data-holding={holding}
        data-value={dataValue}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onContextMenu={(event) => {
          if (holdable) event.preventDefault()
        }}
      >
        {holdable &&
          <svg
            className="AppFab_holdRing"
            viewBox="0 0 64 64"
            aria-hidden="true"
          >
            <circle
              className="AppFab_holdTrack"
              cx="32"
              cy="32"
              r="30"
            />
            <circle
              className="AppFab_holdProgress"
              cx="32"
              cy="32"
              r="30"
              pathLength="100"
            />
          </svg>
        }
        {children}
      </ActionIcon>
    </Tooltip>
  )
}
