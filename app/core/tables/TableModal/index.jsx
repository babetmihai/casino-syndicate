
import { Button, Modal, TextInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const formik = useFormik({
    initialValues: {
      name: "",
      type: "Roulette"
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required"))
    }),
    onSubmit: async (values, formik) => {
      try {
        formik.setSubmitting(true)
        await onSubmit(values)
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
      title={<Text size="xl" fw={700}>{t("create_table")}</Text>}
      centered
      size="sm"
      radius="md"
    >
      <div className="TableModal_form">
        <TextInput
          label="Name"
          placeholder="Name"
          onChange={(value) => {
            formik.setFieldValue("name", value)
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
