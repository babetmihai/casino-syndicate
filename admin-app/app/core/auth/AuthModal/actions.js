import { hideModal } from "../../modals"
import { login } from ".."


export const connectMetamask = async () => {
  await login()
  hideModal()
}
