import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"


const DepositModal = ({ onSubmit }) => {
  const { t } = useTranslation()
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
      title={<Text fw={500}>{t("fund_table")}</Text>}
    >
      <NumberInput
        label="Amount (ETH)"
        min={1}
        step={1}
        allowDecimal={false}
        hideControls
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
          {t("deposit")}
        </Button>
      </Group>
    </Modal>
  )
}

export default DepositModal
