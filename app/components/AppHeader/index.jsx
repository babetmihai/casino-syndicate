import React from "react"
import "./index.scss"
import { Button, Card } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAccount } from "../../core/wallet"
import { disconnectWallet } from "../../core/wallet"
import { showModal } from "../../core/modals"
import WalletModal from "../../core/wallet/WalletModal"

const AppHeader = ({ children }) => {
  const account = useSelector(() => selectAccount())
  return (

    <Card
      shadow="sm"
      p="md"
      className="AppHeader_root"
    >
      <div className="AppHeader_left">
      </div>
      <div className="AppHeader_right">
        {account &&
          <>

            <Button
              onClick={() => showModal(WalletModal)}
              variant="filled"
              color="indigo"
              size="lg"
              radius="md"
            >
              {`Connected: ${account.slice(0, 6)}...`}
            </Button>
            <Button
              onClick={disconnectWallet}
              variant="filled"
              color="red"
              size="lg"
              radius="md"
              ml="md"
            >
              Disconnect
            </Button>
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
