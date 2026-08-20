import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { MIN_BET, clampEth } from "app/games/roulette/chips"


const EditTableModal = ({ onSubmit, minBet, maxBet, maxCap, bankroll }) => {
  const { t } = useTranslation()
  const formik = useFormik({
    initialValues: {
      minBet,
      maxBet
    },
    validationSchema: Yup.object({
      minBet: Yup.number().min(MIN_BET, t("balance_required")).max(maxCap, t("balance_required")),
      maxBet: Yup.number().min(MIN_BET, t("balance_required")).max(maxCap, t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await onSubmit({
          minBet: clampEth(values.minBet),
          maxBet: clampEth(values.maxBet)
        })
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  const minValue = clampEth(formik.values.minBet)
  const maxValue = clampEth(formik.values.maxBet)
  const canSave = minValue >= MIN_BET && maxValue >= minValue && maxValue <= maxCap

  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text fw={500}>{t("edit_table")}</Text>}
    >
      <Text size="sm" c="dimmed" mb="md">
        Bankroll {clampEth(bankroll)} ETH. Max cannot exceed 1/100 of the deposit.
      </Text>
      <Group grow align="flex-start">
        <NumberInput
          label="Minimum"
          min={MIN_BET}
          max={maxCap}
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
          label="Maximum"
          min={MIN_BET}
          max={maxCap}
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
          disabled={!canSave}
          onClick={formik.handleSubmit}
        >
          {t("save")}
        </Button>
      </Group>
    </Modal>
  )
}

export default EditTableModal
