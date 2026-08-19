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

export const AppFab = ({ label, children, onClick }) => {
  return (
    <Tooltip
      label={label}
      position="left"
      withArrow
    >
      <ActionIcon
        size={60}
        radius="xl"
        variant="filled"
        aria-label={label}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  )
}
