import React from "react"
import { Modal, Text, Button, Group, NumberInput } from "@mantine/core"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { MIN_BET, clampEth } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"
import { selectAuth, withdrawSession } from ".."


const SessionWithdrawModal = () => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const { balance } = useSelector(() => selectAuth()) || {}
  const maxAmount = clampEth(balance)
  const formik = useFormik({
    initialValues: {
      balance: maxAmount
    },
    validationSchema: Yup.object({
      balance: Yup.number().moreThan(0, t("balance_required")).max(maxAmount, t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await withdrawSession(clampEth(values.balance))
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  return (
    <Modal
      className={cn("session-withdraw-modal")}
      classNames={{ content: cn("session-withdraw-modal-content"), body: cn("session-withdraw-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("session-withdraw-modal-title")} fw={500}>{t("withdraw")}</Text>}
    >
      <Text className={cn("session-withdraw-modal-copy")} size="sm" c="dimmed" mb="md">
        Send {symbol} from your play wallet back to your main account.
      </Text>
      <NumberInput
        className={cn("session-withdraw-modal-amount")}
        label={`Amount (${symbol})`}
        min={MIN_BET}
        max={maxAmount}
        step={0.01}
        decimalScale={2}
        allowDecimal
        allowNegative={false}
        clampBehavior="strict"
        value={formik.values.balance}
        onChange={(value) => {
          formik.setFieldValue("balance", value)
        }}
      />
      <Group className={cn("session-withdraw-modal-actions")} justify="flex-end" gap="sm" mt="md">
        <Button
          className={cn("session-withdraw-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("session-withdraw-modal-submit")}
          loading={formik.isSubmitting}
          disabled={maxAmount <= 0}
          onClick={formik.handleSubmit}
        >
          {t("withdraw")}
        </Button>
      </Group>
    </Modal>
  )
}

export default SessionWithdrawModal
