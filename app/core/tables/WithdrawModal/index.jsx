import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { MIN_BET, clampEth, isTableLocked } from "app/games/roulette/chips"


const WithdrawModal = ({ onSubmit, max, bankroll, maxBet }) => {
  const { t } = useTranslation()
  const maxAmount = clampEth(max)
  const formik = useFormik({
    initialValues: {
      balance: maxAmount
    },
    validationSchema: Yup.object({
      balance: Yup.number().min(MIN_BET, t("balance_required")).max(maxAmount, t("balance_required"))
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

  const remaining = clampEth(clampEth(bankroll) - clampEth(formik.values.balance))
  const willLock = isTableLocked(remaining, maxBet)

  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text fw={500}>{t("withdraw")}</Text>}
    >
      {willLock &&
        <Text size="sm" c="red" mb="md">
          This withdraw will lock the table.
        </Text>
      }
      {!willLock &&
        <Text size="sm" c="dimmed" mb="md">
          Withdrawing below 100× max will lock the table.
        </Text>
      }
      <NumberInput
        label="Amount (ETH)"
        min={MIN_BET}
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
      <Group justify="flex-end" gap="sm" mt="md">
        <Button
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          loading={formik.isSubmitting}
          disabled={maxAmount < MIN_BET}
          onClick={formik.handleSubmit}
        >
          {t("withdraw")}
        </Button>
      </Group>
    </Modal>
  )
}

export default WithdrawModal
