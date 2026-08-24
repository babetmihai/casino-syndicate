import { showModal } from "app/core/modals"
import DepositModal from "app/core/tables/DepositModal"
import WithdrawModal from "app/core/tables/WithdrawModal"
import { buyTableShares, withdrawTableShares } from "app/games/roulette"
import { clampEth } from "app/games/roulette/chips"
import history from "app/core/history"


export const openPlay = (address) => history.push(`/tables/${address}`)

export const openDeposit = (address) => {
  showModal(DepositModal, {
    onSubmit: async ({ balance }) => {
      await buyTableShares({ balance }, address)
    }
  })
}

export const openWithdraw = (address, shareAmount, withdrawAt) => {
  showModal(WithdrawModal, {
    max: clampEth(shareAmount),
    lastWithdrawAt: withdrawAt,
    onSubmit: async ({ balance }) => {
      await withdrawTableShares({ balance }, address)
    }
  })
}
