import { Button, Group, Modal, NumberInput, TextInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { TABLE_TYPES } from ".."


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const formik = useFormik({
    initialValues: {
      name: "",
      type: TABLE_TYPES.Roulette,
      balance: 1000
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required")),
      balance: Yup.number().moreThan(0, t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await onSubmit(values)
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
        label="Amount (chips)"
        min={1}
        step={1}
        allowDecimal={false}
        hideControls
        mt="md"
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
          onClick={formik.handleSubmit}
        >
          {t("create")}
        </Button>
      </Group>
    </Modal>
  )
}

export default TableModal
