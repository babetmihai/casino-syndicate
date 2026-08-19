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

export const AppFab = ({ label, children, onClick, secondary, selected, disabled, loading, className, dataValue }) => {
  let variant = "filled"
  if (secondary) variant = "default"
  let fabClass = "AppFab_root"
  if (className) fabClass = `${fabClass} ${className}`

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
        data-value={dataValue}
        disabled={disabled}
        loading={loading}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}
