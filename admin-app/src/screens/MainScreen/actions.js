import { showModal } from "app/core/modals"
import TableModal from "app/core/tables/TableModal"
import { showAuthModal } from "app/core/auth/AuthModal"
import { createTable } from "app/core/tables"


export const openCreate = () => showModal(TableModal, {
  onSubmit: async (values) => {
    await createTable(values)
  }
})

export const openConnect = () => showAuthModal()
