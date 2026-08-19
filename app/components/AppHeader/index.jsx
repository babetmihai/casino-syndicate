import React from "react"
import "./index.scss"
import { ActionIcon, Paper, Title } from "@mantine/core"
import { ArrowLeftIcon } from "@phosphor-icons/react"
import { useSelector } from "react-redux"
import { selectAuth } from "../../core/auth"
import AuthMenu from "../../core/auth/AuthMenu"


const AppHeader = ({ name, onBack, action }) => {
  const { account } = useSelector(() => selectAuth()) || {}

  return (
    <Paper className="AppHeader_root" shadow="xs" radius={0}>
      <div className="AppHeader_left">
        {onBack && (
          <ActionIcon
            color="gray"
            size="lg"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeftIcon size={24} />
          </ActionIcon>
        )}
        {name &&
          <Title order={3} fw={500} lineClamp={1}>
            {name}
          </Title>
        }
      </div>
      <div className="AppHeader_right">
        {action}
        {account && <AuthMenu />}
      </div>
    </Paper>
  )
}

export default AppHeader
