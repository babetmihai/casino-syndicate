import { Button, Group, Modal, NumberInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"


const WithdrawModal = ({ onSubmit, max }) => {
  const { t } = useTranslation()
  const maxAmount = Math.floor(max)
  const formik = useFormik({
    initialValues: {
      balance: maxAmount
    },
    validationSchema: Yup.object({
      balance: Yup.number().min(1, t("balance_required")).max(maxAmount, t("balance_required"))
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
      title={<Text fw={500}>{t("withdraw")}</Text>}
    >
      <NumberInput
        label="Amount (ETH)"
        min={1}
        max={maxAmount}
        step={1}
        allowDecimal={false}
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
          onClick={formik.handleSubmit}
        >
          {t("withdraw")}
        </Button>
      </Group>
    </Modal>
  )
}

export default WithdrawModal
