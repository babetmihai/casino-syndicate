import { hideModal } from "app/core/modals"
import { withdrawSession } from ".."
import { clampEth } from "app/games/roulette/chips"


export const submitWithdraw = async (values, form) => {
  form.setSubmitting(true)
  try {
    await withdrawSession(clampEth(values.balance))
    hideModal()
  } finally {
    form.setSubmitting(false)
  }
}
