import React from "react"
import { MantineProvider, Button } from "@mantine/core"
import { useSelector } from "react-redux"
import { disconnectWallet, selectWallet } from "./core/wallet"
import { showModal } from "./core/modals"
import WalletModal from "./core/wallet/WalletModal"
import ModalDispatcher from "./core/modals/ModalDispatcher"


function WalletConnect() {
  const { account } = useSelector(() => selectWallet())

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Button
        onClick={() => showModal(WalletModal)}
        variant="filled"
        color="indigo"
        size="lg"
        radius="md"
      >
        {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
      </Button>


      {account && (
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
      )}
    </div>
  )

}

function App() {
  return (
    <MantineProvider>
      <WalletConnect />
      <ModalDispatcher />
    </MantineProvider>
  )
}

export default App