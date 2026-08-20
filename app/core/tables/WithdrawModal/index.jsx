import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { clampEth, WITHDRAW_INTERVAL } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"


const WithdrawModal = ({ onSubmit, max, lastWithdrawAt }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const maxAmount = clampEth(max)
  const nextAt = (Number(lastWithdrawAt) || 0) + WITHDRAW_INTERVAL
  const canWithdraw = Date.now() / 1000 >= nextAt
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
        await onSubmit({
          balance: clampEth(values.balance)
        })
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  return (
    <Modal
      className={cn("withdraw-modal")}
      classNames={{ content: cn("withdraw-modal-content"), body: cn("withdraw-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("withdraw-modal-title")} fw={500}>{t("withdraw")}</Text>}
    >
      {canWithdraw &&
        <Text className={cn("withdraw-modal-hint")} size="sm" c="dimmed" mb="md">
          You can withdraw once per day.
        </Text>
      }
      {!canWithdraw &&
        <Text className={cn("withdraw-modal-hint", "withdraw-modal-hint-blocked")} size="sm" c="red" mb="md">
          You can withdraw once per day.
        </Text>
      }
      <NumberInput
        className={cn("withdraw-modal-amount")}
        label={`Amount (${symbol})`}
        min={0}
        max={maxAmount}
        step={0.01}
        decimalScale={2}
        allowDecimal
        allowNegative={false}
        clampBehavior="strict"
        data-autofocus
        value={formik.values.balance}
        onChange={(value) => {
          formik.setFieldValue("balance", value)
        }}
      />
      <Group className={cn("withdraw-modal-actions")} justify="flex-end" gap="sm" mt="md">
        <Button
          className={cn("withdraw-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("withdraw-modal-submit")}
          loading={formik.isSubmitting}
          disabled={!canWithdraw || maxAmount <= 0}
          onClick={formik.handleSubmit}
        >
          {t("withdraw")}
        </Button>
      </Group>
    </Modal>
  )
}

export default WithdrawModal
