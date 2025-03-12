import React from "react"
import { Modal, Text, Button } from "@mantine/core"
import { hideModal } from "../../modals"
import "./index.scss"
import { initAccount } from ".."
import { useTranslation } from "react-i18next"

const WalletModal = () => {
  const { t } = useTranslation()
  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text size="xl" fw={700}>Connect to a Wallet</Text>}
      centered
      size="sm"
      radius="md"
    >
      <div className="WalletModal_buttons">
        <Button
          fullWidth
          variant="filled"
          color="blue"
          size="md"
          onClick={async () => {
            await initAccount()
            hideModal()
          }}
        >
          {t("MetaMask")}
        </Button>
        <Button
          fullWidth
          variant="outline"
          color="gray"
          size="md"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
      </div>
    </Modal>
  )
}

export default WalletModal