import { Button, Group, Modal, NumberInput, TextInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { TABLE_TYPES } from ".."
import { MIN_TABLE_DEPOSIT, clampEth } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const formik = useFormik({
    initialValues: {
      name: "",
      type: TABLE_TYPES.Roulette,
      balance: 10
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required")),
      balance: Yup.number().min(MIN_TABLE_DEPOSIT, t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await onSubmit({
          ...values,
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
      opened
      onClose={hideModal}
      title={<Text fw={500}>{t("create_table")}</Text>}
    >
      <TextInput
        name="name"
        label="Table name"
        placeholder="Saturday night"
        data-autofocus
        onChange={(event) => {
          formik.setFieldValue("name", event.target.value)
        }}
      />
      <NumberInput
        label={`Amount (${symbol})`}
        min={MIN_TABLE_DEPOSIT}
        step={0.01}
        decimalScale={2}
        allowDecimal
        allowNegative={false}
        clampBehavior="strict"
        mt="md"
        value={formik.values.balance}
        onChange={(value) => {
          formik.setFieldValue("balance", value)
        }}
      />
      <Text size="sm" c="dimmed" mt="xs">
        Minimum {MIN_TABLE_DEPOSIT} {symbol}.
      </Text>
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
          onClick={formik.handleSubmit}
        >
          {t("create")}
        </Button>
      </Group>
    </Modal>
  )
}

export default TableModal
