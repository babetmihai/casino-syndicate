import { logout, requestTestEth } from ".."
import { showSessionModal } from "../SessionModal"
import { showSessionWithdrawModal } from "../SessionWithdrawModal"


export const openDeposit = () => showSessionModal()

export const openWithdraw = () => showSessionWithdrawModal()

export const requestFunds = () => requestTestEth()

export const signOut = () => logout()
