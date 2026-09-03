import { showAuthModal } from "app/core/auth/AuthModal"
import history from "app/core/history"


export const goHome = () => history.push("/")

export const openConnect = () => showAuthModal()
