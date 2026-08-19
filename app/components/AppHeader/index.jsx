import React from "react"
import "./index.scss"
import { Button, Paper, Title, ActionIcon } from "@mantine/core"
import { useSelector } from "react-redux"
import { showModal } from "../../core/modals"
import AuthModal from "../../core/auth/AuthModal"
import AuthMenu from "../../core/auth/AuthMenu"
import { ArrowLeft, Wallet } from "tabler-icons-react"
import { selectAuth } from "../../core/auth"


const AppHeader = ({ name, onBack, actions }) => {
  const auth = useSelector(() => selectAuth())
  const { account } = auth || {}

  return (
    <Paper className="AppHeader_root" shadow="xs" radius={0}>
      <div className="AppHeader_left">
        {onBack && (
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </ActionIcon>
        )}
        <Title order={4} fw={500} lineClamp={1}>
          {name}
        </Title>
      </div>
      <div className="AppHeader_right">
        {actions}
        {account && <AuthMenu />}
        {!account &&
          <Button
            onClick={() => showModal(AuthModal)}
            variant="filled"
            leftSection={<Wallet size={16} />}
          >
            Connect
          </Button>
        }
      </div>
    </Paper>
  )
}

export default AppHeader
