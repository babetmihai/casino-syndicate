import { logout, requestTestEth } from ".."


export const requestFunds = () => requestTestEth()

export const signOut = () => logout()
