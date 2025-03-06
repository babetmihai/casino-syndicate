import React from "react"
import { Button } from "@mantine/core"
import { showModal } from "../../core/modals"
import WalletModal from "../../core/wallet/WalletModal"

const LoginScreen = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Button
        onClick={() => showModal(WalletModal)}
        variant="filled"
        color="indigo"
        size="lg"
        radius="md"
      >
        Connect Wallet
      </Button>
    </div>
  )
}

export default LoginScreen
