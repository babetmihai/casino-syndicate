import React from "react"
import { Modal, Text, Button, Group } from "@mantine/core"
import { hideModal } from "../../modals"
import { useTranslation } from "react-i18next"
import { login } from ".."


const AuthModal = () => {
  const { t } = useTranslation()
  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text fw={500}>{t("connect_wallet")}</Text>}
    >
      <Text size="sm" c="dimmed" mb="md">
        Use MetaMask on Localhost 1337.
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={async () => {
            await login()
            hideModal()
          }}
        >
          MetaMask
        </Button>
      </Group>
    </Modal>
  )
}

export default AuthModal
