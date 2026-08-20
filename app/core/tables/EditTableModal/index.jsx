import { Button, Group, Modal, NumberInput, TextInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { LOW_BANKROLL_MULTIPLIER, MIN_BET, clampEth } from "app/games/roulette/chips"
import { TABLE_TYPES } from ".."
import { cn } from "app/core"


const EditTableModal = ({ onSubmit, name, minBet, maxBet, type }) => {
  const { t } = useTranslation()
  const isRoulette = type === TABLE_TYPES.Roulette
  let schema = {
    name: Yup.string().required(t("name_required"))
  }
  if (isRoulette) {
    schema = {
      ...schema,
      minBet: Yup.number().min(MIN_BET, t("balance_required")),
      maxBet: Yup.number().min(Yup.ref("minBet"), t("balance_required"))
    }
  }
  const formik = useFormik({
    initialValues: {
      name,
      minBet,
      maxBet
    },
    validationSchema: Yup.object(schema),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        const payload = { name: values.name.trim() }
        if (isRoulette) {
          payload.minBet = clampEth(values.minBet)
          payload.maxBet = clampEth(values.maxBet)
        }
        await onSubmit(payload)
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  const nextName = (formik.values.name || "").trim()
  const minValue = clampEth(formik.values.minBet)
  const maxValue = clampEth(formik.values.maxBet)
  let canSave = Boolean(nextName)
  if (isRoulette) canSave = canSave && minValue >= MIN_BET && maxValue >= minValue

  return (
    <Modal
      className={cn("edit-table-modal")}
      classNames={{ content: cn("edit-table-modal-content"), body: cn("edit-table-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("edit-table-modal-title")} fw={500}>{t("edit_table")}</Text>}
    >
      <TextInput
        className={cn("edit-table-modal-name")}
        name="name"
        label="Table name"
        data-autofocus
        value={formik.values.name}
        onChange={(event) => {
          formik.setFieldValue("name", event.target.value)
        }}
      />
      {isRoulette &&
        <Group className={cn("edit-table-modal-limits")} grow align="flex-start" mt="md">
          <NumberInput
            className={cn("edit-table-modal-min")}
            label="Minimum"
            min={MIN_BET}
            step={0.01}
            decimalScale={2}
            allowDecimal
            allowNegative={false}
            clampBehavior="strict"
            value={formik.values.minBet}
            onChange={(value) => {
              formik.setFieldValue("minBet", value)
            }}
          />
          <NumberInput
            className={cn("edit-table-modal-max")}
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
      }
      {isRoulette &&
        <Text className={cn("edit-table-modal-hint")} size="sm" c="dimmed" mt="xs">
          Bankroll under {LOW_BANKROLL_MULTIPLIER}× max is shown as low.
        </Text>
      }
      <Group className={cn("edit-table-modal-actions")} justify="flex-end" gap="sm" mt="md">
        <Button
          className={cn("edit-table-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("edit-table-modal-save")}
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
