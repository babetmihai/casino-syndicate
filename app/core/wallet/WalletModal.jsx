import React from "react"
import { Modal, Text, Button } from "@mantine/core"
import { hideModal } from "../modals"
import { connectAccount } from "."

const WalletModal = () => {
  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text size="xl" fw={700}>Connect to a Wallet</Text>}
      centered
      size="sm"
      radius="md"
    >
      <Button
        fullWidth
        variant="filled"
        color="blue"
        size="md"
        mb="sm"
        onClick={async () => {
          await connectAccount()
          hideModal()
        }}
      >
        MetaMask
      </Button>
      <Button
        fullWidth
        variant="outline"
        color="gray"
        size="md"
        onClick={hideModal}
      >
        Cancel
      </Button>
    </Modal>
  )
}

export default WalletModal