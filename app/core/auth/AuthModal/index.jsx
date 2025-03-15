import React from "react"
import { Modal, Text, Button } from "@mantine/core"
import { hideModal } from "../../modals"
import "./index.scss"
import { useTranslation } from "react-i18next"
import { login } from ".."


const AuthModal = () => {
  const { t } = useTranslation()
  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text size="xl" fw={700}>{t("connect_to_wallet")}</Text>}
      centered
      size="sm"
      radius="md"
    >
      <div className="AuthModal_buttons">
        <Button
          fullWidth
          variant="filled"
          color="blue"
          size="md"
          onClick={async () => {
            await login()
            hideModal()
          }}
        >
          {t("metamask")}
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

export default AuthModal
