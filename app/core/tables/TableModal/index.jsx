import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { TABLE_TYPES } from ".."
import { LOW_BANKROLL_MULTIPLIER, MIN_BET, MIN_TABLE_DEPOSIT, clampEth } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const formik = useFormik({
    initialValues: {
      type: TABLE_TYPES.Roulette,
      balance: 10,
      minBet: MIN_BET,
      maxBet: 0.05
    },
    validationSchema: Yup.object({
      balance: Yup.number().min(MIN_TABLE_DEPOSIT, t("balance_required")),
      minBet: Yup.number().min(MIN_BET, t("balance_required")),
      maxBet: Yup.number().min(Yup.ref("minBet"), t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await onSubmit({
          ...values,
          balance: clampEth(values.balance),
          minBet: clampEth(values.minBet),
          maxBet: clampEth(values.maxBet)
        })
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  return (
    <Modal
      className={cn("table-modal")}
      classNames={{ content: cn("table-modal-content"), body: cn("table-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("table-modal-title")} fw={500}>{t("create_table")}</Text>}
    >
      <Group
        className={cn("table-modal-limits")}
        grow
        align="flex-start"
      >
        <NumberInput
          className={cn("table-modal-min")}
          label="Minimum"
          min={MIN_BET}
          step={0.01}
          decimalScale={2}
          allowDecimal
          allowNegative={false}
          clampBehavior="strict"
          data-autofocus
          value={formik.values.minBet}
          onChange={(value) => {
            formik.setFieldValue("minBet", value)
          }}
        />
        <NumberInput
          className={cn("table-modal-max")}
          label="Maximum"
          min={MIN_BET}
          step={0.01}
          decimalScale={2}
          allowDecimal
          allowNegative={false}
          clampBehavior="strict"
          value={formik.values.maxBet}
          onChange={(value) => {
            formik.setFieldValue("maxBet", value)
          }}
        />
      </Group>
      <NumberInput
        className={cn("table-modal-amount")}
        label={`Amount (${symbol})`}
        min={MIN_TABLE_DEPOSIT}
        step={0.01}
        decimalScale={2}
        allowDecimal
        allowNegative={false}
        mt="md"
        value={formik.values.balance}
        onChange={(value) => {
          formik.setFieldValue("balance", value)
        }}
      />
      <Text
        className={cn("table-modal-hint")}
        size="sm"
        c="dimmed"
        mt="xs"
      >
        {`Minimum ${MIN_TABLE_DEPOSIT} ${symbol}. Bankroll under ${LOW_BANKROLL_MULTIPLIER}× max is shown as low.`}
      </Text>
      <Group
        className={cn("table-modal-actions")}
        justify="flex-end"
        gap="sm"
        mt="md"
      >
        <Button
          className={cn("table-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("table-modal-create")}
          loading={formik.isSubmitting}
          onClick={formik.handleSubmit}
        >
          {t("create")}
        </Button>
      </Group>
    </Modal>
  )
}

export default TableModal
