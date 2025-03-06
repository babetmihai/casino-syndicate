import React from "react"
import "./index.scss"
import { Button, Card } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAccount } from "../../core/wallet"
import { disconnectWallet } from "../../core/wallet"
import { showModal } from "../../core/modals"
import WalletModal from "../../core/wallet/WalletModal"
import { Logout } from "tabler-icons-react"
import AccountMenu from "../AccountMenu"


const AppHeader = () => {
  const account = useSelector(() => selectAccount())
  return (

    <Card
      shadow="sm"
      p="md"
      gap="md"
      className="AppHeader_root"
    >
      <div className="AppHeader_left">
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
            variant="filled"
            color="indigo"
            size="lg"
            radius="md"
          >
            Connect Wallet
          </Button>

        }
      </div>
    </Card>

  )
}

export default AppHeader
