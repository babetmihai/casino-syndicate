import React from "react"
import { Modal, Text, Button, Group } from "@mantine/core"
import { hideModal, showModal } from "../../modals"
import { useTranslation } from "react-i18next"
import { chainFromId, targetChainId } from "app/core/chain"
import { cn } from "app/core"
import { connectMetamask } from "./actions"


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
      <Text
        className={cn("auth-modal-copy")}
        size="sm"
        c="dimmed"
        mb="md"
      >
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
          onClick={connectMetamask}
        >
          MetaMask
        </Button>
      </Group>
    </Modal>
  )
}

export const showAuthModal = () => showModal(AuthModal)

export default AuthModal
