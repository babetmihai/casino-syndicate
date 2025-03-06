import React, { Component } from "react"
import { MantineProvider, Button, Modal, Text } from "@mantine/core"
import { ethers } from "ethers"

class WalletConnect extends Component {
  state = {
    isOpen: false,
    account: null,
    provider: null,
    error: null
  }

  connectWallet = async () => {
    if (!window.ethereum) {
      this.setState({ error: "MetaMask not detected. Please install it." })
      return
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const account = accounts[0]

      this.setState({
        account,
        provider,
        isOpen: false,
        error: null
      })
    } catch (error) {
      console.error("Connection failed:", error)
      this.setState({ error: error.message })
    }
  }

  disconnectWallet = () => {
    this.setState({ account: null, provider: null })
  }

  toggleModal = () => {
    this.setState((prevState) => ({ isOpen: !prevState.isOpen }))
  }

  render() {
    const { account, isOpen, error } = this.state

    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Button
          onClick={this.toggleModal}
          variant="filled"
          color="indigo"
          size="lg"
          radius="md"
        >
          {account ? `Connected: ${account.slice(0, 6)}...` : "Connect Wallet"}
        </Button>

        <Modal
          opened={isOpen}
          onClose={this.toggleModal}
          title={<Text size="xl" fw={700}>Connect to a Wallet</Text>}
          centered
          size="sm"
          radius="md"
        >
          {error && <Text color="red" size="sm" mb="md">{error}</Text>}
          <Button
            fullWidth
            variant="filled"
            color="blue"
            size="md"
            mb="sm"
            onClick={this.connectWallet}
          >
            MetaMask
          </Button>
          <Button
            fullWidth
            variant="outline"
            color="gray"
            size="md"
            onClick={this.toggleModal}
          >
            Cancel
          </Button>
        </Modal>

        {account && (
          <Button
            onClick={this.disconnectWallet}
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
}

function App() {
  return (
    <MantineProvider>
      <WalletConnect />
    </MantineProvider>
  )
}

export default App