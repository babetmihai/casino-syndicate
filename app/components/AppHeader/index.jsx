import React from "react"
import "./index.scss"
import { Button, Card, Title } from "@mantine/core"
import { useSelector } from "react-redux"
import { showModal } from "../../core/modals"
import WalletModal from "../../core/wallet/WalletModal"
import AccountMenu from "../AccountMenu"
import { Wallet } from "tabler-icons-react"
import { selectWallet } from "../../core/wallet"

const AppHeader = ({ name }) => {
  const { account } = useSelector(() => selectWallet())
  return (
    <Card
      shadow="sm"
      p="sm"
      mih="4.25rem"
      gap="md"
      className="AppHeader_root"
    >
      <div className="AppHeader_left">
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
            onClick={() => showModal(WalletModal)}
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
