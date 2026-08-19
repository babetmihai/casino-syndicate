import { Button, Group, Modal, TextInput, Text } from "@mantine/core"
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
      type: TABLE_TYPES.Roulette
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required"))
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
