import React from "react"
import { Modal, Text, Button, Group } from "@mantine/core"
import { showModal, hideModal } from "../../modals"
import { useTranslation } from "react-i18next"
import { login, selectAuth } from ".."
import SessionModal from "../SessionModal"
import { chainFromId, targetChainId } from "app/core/chain"
import { cn } from "app/core"


const AuthModal = () => {
  const { t } = useTranslation()
  const { name } = chainFromId(targetChainId())
  return (
    <Modal
      className={cn("auth-modal")}
      classNames={{ content: cn("auth-modal-content"), body: cn("auth-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("auth-modal-title")} fw={500}>{t("connect_wallet")}</Text>}
    >
      <Text className={cn("auth-modal-copy")} size="sm" c="dimmed" mb="md">
        Use MetaMask on {name}.
      </Text>
      <Group className={cn("auth-modal-actions")} justify="flex-end" gap="sm">
        <Button
          className={cn("auth-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("auth-modal-metamask")}
          onClick={async () => {
            await login()
            hideModal()
            const { session } = selectAuth() || {}
            const { authorized } = session || {}
            if (!authorized) showModal(SessionModal)
          }}
        >
          MetaMask
        </Button>
      </Group>
    </Modal>
  )
}

export default AuthModal
