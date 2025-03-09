
import { Button, Modal, NumberInput, Text, TextInput } from "@mantine/core"
import React from "react"
import { createTable } from "app/core/tables"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"


const TableModal = () => {
  const { t } = useTranslation()
  const formik = useFormik({
    initialValues: {
      name: "",
      balance: 0
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required")),
      balance: Yup.number().required(t("balance_required"))
    }),
    onSubmit: async (values, formik) => {
      try {
        formik.setSubmitting(true)
        await createTable(values)
        hideModal()
      } finally {
        formik.setSubmitting(false)
      }
    }
  })

  return (
    <Modal
      opened
      onClose={hideModal}
      title={<Text size="xl" fw={700}>Create a Table</Text>}
      centered
      size="sm"
      radius="md"
    >
      <div className="TableModal_form">
        <TextInput
          label="Name"
          placeholder="Name"
          onChange={(event) => {
            formik.setFieldValue("name", event.target.value)
          }}
        />
        <NumberInput
          label="Balance"
          placeholder="Balance"
          onChange={(value) => {
            formik.setFieldValue("balance", value)
          }}
        />
      </div>
      <div className="TableModal_buttons">
        <Button
          fullWidth
          variant="filled"
          color="blue"
          size="md"
          loading={formik.isSubmitting}
          onClick={formik.handleSubmit}
        >
          {t("ok")}
        </Button>
        <Button
          fullWidth
          variant="outline"
          color="gray"
          size="md"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
      </div>
    </Modal>
  )
}

export default TableModal
