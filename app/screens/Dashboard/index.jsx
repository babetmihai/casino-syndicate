import React from "react"
import { useSelector } from "react-redux"
import { Button } from "@mantine/core"
import { showModal } from "../../core/modals"
import { selectAccount } from "../../core/wallet"
import WalletModal from "../../core/wallet/WalletModal"
import { disconnectWallet } from "../../core/wallet"

const DashboardScreen = () => {
  const account = useSelector(() => selectAccount())

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
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

    </div>
  )
}

export default DashboardScreen
