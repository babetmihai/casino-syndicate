import { Button, Group, Modal, NumberInput, SegmentedControl, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { TABLE_TYPES } from ".."
import { LOW_BANKROLL_MULTIPLIER, MIN_BET, MIN_TABLE_DEPOSIT, clampEth } from "app/games/roulette/chips"
import { MAX_POLYGONS, MIN_POLYGONS } from "app/games/polygons"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"
import _ from "lodash"


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const formik = useFormik({
    initialValues: {
      type: TABLE_TYPES.Roulette,
      balance: 10,
      minBet: MIN_BET,
      maxBet: 0.05,
      polygonCount: 12,
      ticketPrice: MIN_BET
    },
    validationSchema: Yup.object({
      balance: Yup.number().min(MIN_TABLE_DEPOSIT, t("balance_required")),
      minBet: Yup.number().when("type", {
        is: TABLE_TYPES.Roulette,
        then: (schema) => schema.min(MIN_BET, t("balance_required")),
        otherwise: (schema) => schema.notRequired()
      }),
      maxBet: Yup.number().when("type", {
        is: TABLE_TYPES.Roulette,
        then: (schema) => schema.min(Yup.ref("minBet"), t("balance_required")),
        otherwise: (schema) => schema.notRequired()
      }),
      polygonCount: Yup.number().when("type", {
        is: TABLE_TYPES.Polygons,
        then: (schema) => schema.min(MIN_POLYGONS).max(MAX_POLYGONS),
        otherwise: (schema) => schema.notRequired()
      }),
      ticketPrice: Yup.number().when("type", {
        is: TABLE_TYPES.Polygons,
        then: (schema) => schema.min(MIN_BET, t("balance_required")),
        otherwise: (schema) => schema.notRequired()
      })
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        const polygonCount = _.clamp(_.round(Number(values.polygonCount) || 0), MIN_POLYGONS, MAX_POLYGONS)
        await onSubmit({
          ...values,
          balance: clampEth(values.balance),
          minBet: clampEth(values.minBet),
          maxBet: clampEth(values.maxBet),
          polygonCount,
          ticketPrice: clampEth(values.ticketPrice)
        })
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  const isPolygons = formik.values.type === TABLE_TYPES.Polygons

  return (
    <Modal
      className={cn("table-modal")}
      classNames={{ content: cn("table-modal-content"), body: cn("table-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("table-modal-title")} fw={500}>{t("create_table")}</Text>}
    >
      <SegmentedControl
        className={cn("table-modal-type", "w-full")}
        fullWidth
        data-autofocus
        value={formik.values.type}
        onChange={(value) => {
          formik.setFieldValue("type", value)
        }}
        data={[
          { label: "Roulette", value: TABLE_TYPES.Roulette },
          { label: "Polygons", value: TABLE_TYPES.Polygons }
        ]}
      />
      {!isPolygons &&
        <Group className={cn("table-modal-limits")} grow align="flex-start" mt="md">
          <NumberInput
            className={cn("table-modal-min")}
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
      }
      {isPolygons &&
        <Group className={cn("table-modal-polygons-fields")} grow align="flex-start" mt="md">
          <NumberInput
            className={cn("table-modal-polygons")}
            label="Polygons"
            min={MIN_POLYGONS}
            max={MAX_POLYGONS}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            value={formik.values.polygonCount}
            onChange={(value) => {
              formik.setFieldValue("polygonCount", value)
            }}
          />
          <NumberInput
            className={cn("table-modal-ticket")}
            label="Ticket"
            min={MIN_BET}
            step={0.01}
            decimalScale={2}
            allowDecimal
            allowNegative={false}
            clampBehavior="strict"
            value={formik.values.ticketPrice}
            onChange={(value) => {
              formik.setFieldValue("ticketPrice", value)
            }}
          />
        </Group>
      }
      <NumberInput
        className={cn("table-modal-amount")}
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
      <Text className={cn("table-modal-hint")} size="sm" c="dimmed" mt="xs">
        Minimum {MIN_TABLE_DEPOSIT} {symbol}. Bankroll under {LOW_BANKROLL_MULTIPLIER}× max is shown as low.
      </Text>
      <Group className={cn("table-modal-actions")} justify="flex-end" gap="sm" mt="md">
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
