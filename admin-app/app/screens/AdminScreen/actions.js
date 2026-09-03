import { showModal } from "app/core/modals"
import WithdrawModal from "app/core/tables/WithdrawModal"
import { withdrawTableShares } from "app/games/roulette"
import { clampEth } from "app/games/roulette/chips"


export const openWithdraw = (address, shareAmount, withdrawAt) => {
  showModal(WithdrawModal, {
    max: clampEth(shareAmount),
    lastWithdrawAt: withdrawAt,
    onSubmit: async ({ balance }) => {
      await withdrawTableShares({ balance }, address)
    }
  })
}
