import React from "react"
import { Modal, Text, Button, Group, NumberInput } from "@mantine/core"
import { hideModal, showModal } from "app/core/modals"
import { useFormik } from "formik"
import * as Yup from "yup"
import { useTranslation } from "react-i18next"
import { MIN_BET, clampEth, ethLabel } from "app/games/roulette/chips"
import { useSelector } from "react-redux"
import { selectNativeSymbol } from "app/core/chain"
import { cn } from "app/core"
import { depositSession, fetchWalletBalance, selectAuth } from ".."


export const requirePlayWallet = () => {
  const { session } = selectAuth() || {}
  const { authorized } = session || {}
  if (authorized) return true
  showModal(SessionModal)
  return false
}

const SessionModal = () => {
  const { t } = useTranslation()
  const symbol = useSelector(() => selectNativeSymbol())
  const { session, walletBalance } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const accountBalance = clampEth(walletBalance)

  React.useEffect(() => {
    fetchWalletBalance()
  }, [])

  const formik = useFormik({
    initialValues: {
      balance: 1
    },
    validationSchema: Yup.object({
      balance: Yup.number().moreThan(0, t("balance_required"))
    }),
    onSubmit: async (values, form) => {
      form.setSubmitting(true)
      try {
        let amount = clampEth(values.balance)
        if (amount > accountBalance) amount = accountBalance
        await depositSession(amount)
        hideModal()
      } finally {
        form.setSubmitting(false)
      }
    }
  })

  let copy = `Deposit ${symbol} into your play wallet. Bets are paid from this balance without MetaMask prompts.`
  if (!authorized) copy = `Authorize a play wallet and deposit ${symbol}. Later table actions will not prompt MetaMask.`

  return (
    <Modal
      className={cn("session-modal")}
      classNames={{ content: cn("session-modal-content"), body: cn("session-modal-body") }}
      opened
      onClose={hideModal}
      title={<Text className={cn("session-modal-title")} fw={500}>Deposit</Text>}
    >
      <Text className={cn("session-modal-copy")} size="sm" c="dimmed">
        {copy}
      </Text>
      <Text className={cn("session-modal-account-balance")} size="xs" c="dimmed" mt="xs" mb="md">
        Account {ethLabel(accountBalance, symbol)}
      </Text>
      <NumberInput
        className={cn("session-modal-amount")}
        label={`Amount (${symbol})`}
        min={MIN_BET}
        step={0.01}
        decimalScale={2}
        allowDecimal
        allowNegative={false}
        clampBehavior="strict"
        value={formik.values.balance}
        onChange={(value) => {
          formik.setFieldValue("balance", value)
        }}
      />
      <Group className={cn("session-modal-actions")} justify="flex-end" gap="sm" mt="md">
        <Button
          className={cn("session-modal-cancel")}
          variant="subtle"
          color="gray"
          onClick={hideModal}
        >
          {t("cancel")}
        </Button>
        <Button
          className={cn("session-modal-submit")}
          loading={formik.isSubmitting}
          onClick={formik.handleSubmit}
        >
          {t("deposit")}
        </Button>
      </Group>
    </Modal>
  )
}

export default SessionModal
