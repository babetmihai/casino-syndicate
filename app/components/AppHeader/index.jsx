import React from "react"
import "./index.scss"
import { Button, Card, Title, ActionIcon } from "@mantine/core"
import { useSelector } from "react-redux"
import { showModal } from "../../core/modals"
import AuthModal from "../../core/auth/AuthModal"
import AuthMenu from "../../core/auth/AuthMenu"
import { ArrowLeft, Wallet } from "tabler-icons-react"
import { selectAuth } from "../../core/auth"


const AppHeader = ({ name, onBack }) => {
  const auth = useSelector(() => selectAuth())
  return (
    <Card
      shadow="sm"
      p="sm"
      mih="4.25rem"
      gap="md"
      className="AppHeader_root"
    >
      <div className="AppHeader_left">
        {onBack && (
          <ActionIcon variant="light" color="gray" onClick={onBack}>
            <ArrowLeft />
          </ActionIcon>
        )}
        <Title order={3}>{name}</Title>
      </div>
      <div className="AppHeader_right" >
        {auth.account && <AuthMenu /> }
        {!auth.account &&
          <Button
            onClick={() => showModal(AuthModal)}
            variant="light"
            color="gray"
            radius="md"
            leftSection={<Wallet />}
          >
            Connect
          </Button>
        }
      </div>
    </Card>

  )
}

export default AppHeader
