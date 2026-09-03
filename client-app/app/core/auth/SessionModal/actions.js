import { hideModal } from "app/core/modals"
import { depositSession } from ".."
import { clampEth } from "app/games/roulette/chips"


export const submitDeposit = async (values, accountBalance, form) => {
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
