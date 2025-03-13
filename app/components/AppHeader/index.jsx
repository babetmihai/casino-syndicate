import React from "react"
import "./index.scss"
import { Button, Card, Title, ActionIcon } from "@mantine/core"
import { useSelector } from "react-redux"
import { showModal } from "../../core/modals"
import AccountModal from "../../core/account/AccountModal"
import AccountMenu from "../AccountMenu"
import { ArrowLeft, Wallet } from "tabler-icons-react"
import { selectAccount } from "../../core/account"

const AppHeader = ({ name, onBack }) => {
  const account = useSelector(() => selectAccount())
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
        {account &&
          <>
            <AccountMenu />
          </>
        }
        {!account &&
          <Button
            onClick={() => showModal(AccountModal)}
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
