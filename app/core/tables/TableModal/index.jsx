import { Button, Group, Modal, NumberInput, SegmentedControl, TextInput, Text } from "@mantine/core"
import React from "react"
import { hideModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { TABLE_TYPES } from ".."
import { LOW_BANKROLL_MULTIPLIER, MIN_BET, MIN_TABLE_DEPOSIT, clampEth } from "app/games/roulette/chips"
import { MAX_CHANCE, MAX_POLYGONS, MIN_CHANCE, MIN_POLYGONS } from "app/games/lottery"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"
import _ from "lodash"


const TableModal = ({ onSubmit }) => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const formik = useFormik({
    initialValues: {
      name: "",
      type: TABLE_TYPES.Roulette,
      balance: 10,
      minBet: MIN_BET,
      maxBet: 0.05,
      polygonCount: 12,
      winPercent: 20,
      ticketPrice: MIN_BET
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("name_required")),
      balance: Yup.number().when("type", {
        is: TABLE_TYPES.Roulette,
        then: (schema) => schema.min(MIN_TABLE_DEPOSIT, t("balance_required")),
        otherwise: (schema) => schema.notRequired()
      }),
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
        is: TABLE_TYPES.Lottery,
        then: (schema) => schema.min(MIN_POLYGONS).max(MAX_POLYGONS),
        otherwise: (schema) => schema.notRequired()
      }),
      winPercent: Yup.number().when("type", {
        is: TABLE_TYPES.Lottery,
        then: (schema) => schema.min(MIN_CHANCE).max(MAX_CHANCE),
        otherwise: (schema) => schema.notRequired()
      }),
      ticketPrice: Yup.number().when("type", {
        is: TABLE_TYPES.Lottery,
        then: (schema) => schema.min(MIN_BET, t("balance_required")),
        otherwise: (schema) => schema.notRequired()
      })
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        await onSubmit({
          ...values,
          balance: clampEth(values.balance),
          minBet: clampEth(values.minBet),
          maxBet: clampEth(values.maxBet),
          polygonCount: _.clamp(_.round(Number(values.polygonCount) || 0), MIN_POLYGONS, MAX_POLYGONS),
          winPercent: _.clamp(_.round(Number(values.winPercent) || 0, 2), MIN_CHANCE, MAX_CHANCE),
          ticketPrice: clampEth(values.ticketPrice)
        })
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  const isLottery = formik.values.type === TABLE_TYPES.Lottery

  return (
    <Modal
      className={cn("table-modal")}
      classNames={{ content: cn("table-modal-content"), body: cn("table-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("table-modal-title")} fw={500}>{t("create_table")}</Text>}
    >
      <TextInput
        className={cn("table-modal-name")}
        name="name"
        label="Table name"
        placeholder="Saturday night"
        data-autofocus
        onChange={(event) => {
          formik.setFieldValue("name", event.target.value)
        }}
      />
      <SegmentedControl
        className={cn("table-modal-type", "w-full")}
        fullWidth
        mt="md"
        value={formik.values.type}
        onChange={(value) => {
          formik.setFieldValue("type", value)
        }}
        data={[
          { label: "Roulette", value: TABLE_TYPES.Roulette },
          { label: "Lottery", value: TABLE_TYPES.Lottery }
        ]}
      />
      {!isLottery &&
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
      }
      {!isLottery &&
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
      {isLottery &&
        <>
          <NumberInput
            className={cn("table-modal-polygons")}
            label="Polygons"
            min={MIN_POLYGONS}
            max={MAX_POLYGONS}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            mt="md"
            value={formik.values.polygonCount}
            onChange={(value) => {
              formik.setFieldValue("polygonCount", value)
            }}
          />
          <Group className={cn("table-modal-lottery")} grow align="flex-start" mt="md">
            <NumberInput
              className={cn("table-modal-chance")}
              label="Chance"
              min={MIN_CHANCE}
              max={MAX_CHANCE}
              step={0.01}
              decimalScale={2}
              suffix="%"
              allowDecimal
              allowNegative={false}
              value={formik.values.winPercent}
              onChange={(value) => {
                formik.setFieldValue("winPercent", value)
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
        </>
      }
      {!isLottery &&
        <Text className={cn("table-modal-hint")} size="sm" c="dimmed" mt="xs">
          Minimum {MIN_TABLE_DEPOSIT} {symbol}. Bankroll under {LOW_BANKROLL_MULTIPLIER}× max is shown as low.
        </Text>
      }
      {isLottery &&
        <Text className={cn("table-modal-hint")} size="sm" c="dimmed" mt="xs">
          A winning ticket reveals one polygon.
        </Text>
      }
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
