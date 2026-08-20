import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { MIN_BET, clampEth } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"


const DepositModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const formik = useFormik({
    initialValues: {
      balance: 10
    },
    validationSchema: Yup.object({
      balance: Yup.number().moreThan(0, t("balance_required"))
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
      className={cn("deposit-modal")}
      classNames={{ content: cn("deposit-modal-content"), body: cn("deposit-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("deposit-modal-title")} fw={500}>{t("fund_table")}</Text>}
    >
      <NumberInput
        className={cn("deposit-modal-amount")}
        label={`Amount (${symbol})`}
        min={MIN_BET}
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
      <Group className={cn("deposit-modal-actions")} justify="flex-end" gap="sm" mt="md">
        <Button
          className={cn("deposit-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("deposit-modal-submit")}
          loading={formik.isSubmitting}
          onClick={formik.handleSubmit}
        >
          {t("deposit")}
        </Button>
      </Group>
    </Modal>
  )
}

export default DepositModal
