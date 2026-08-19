import React from "react"
import "./index.scss"
import { ActionIcon, Affix, Tooltip } from "@mantine/core"


export const AppFabs = ({ children, raised }) => {
  return (
    <Affix
      className="AppFabs_root"
      position={{
        bottom: raised ? "10rem" : "1.5rem",
        right: "1.5rem"
      }}
    >
      {children}
    </Affix>
  )
}

export const AppFab = ({ label, children, onClick, secondary }) => {
  let variant = "filled"
  let size = 60
  if (secondary) {
    variant = "default"
    size = 48
  }

  return (
    <Tooltip
      label={label}
      position="left"
      withArrow
    >
      <ActionIcon
        size={size}
        radius="xl"
        variant={variant}
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}
