import { hideModal } from "../../modals"
import { login, selectAuth } from ".."
import { showSessionModal } from "../SessionModal"


export const connectMetamask = async () => {
  await login()
  hideModal()
  const { session } = selectAuth() || {}
  const { authorized } = session || {}
  if (!authorized) showSessionModal()
}
