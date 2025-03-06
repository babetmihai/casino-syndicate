import React from "react"
import "./index.scss"
import { Menu, Button, Avatar } from "@mantine/core"
import { Logout, Wallet } from "tabler-icons-react"
import { selectAccount } from "app/core/wallet"
import { useSelector } from "react-redux"
import { showModal } from "app/core/modals"
import WalletModal from "app/core/wallet/WalletModal"
import { disconnectWallet } from "app/core/wallet"

const AccountMenu = () => {
  const account = useSelector(() => selectAccount())
  return (
    <div className="AccountMenu_root">
      <Menu withArrow>
        <Menu.Target>
          <Avatar
            size="md"
            radius="xl"
          >
            {account.replace(/\d/g, "").toUpperCase().slice(0, 2)}
          </Avatar>
        </Menu.Target>
        <Menu.Dropdown >
          <Menu.Item
            onClick={() => showModal(WalletModal)}
            leftSection={<Wallet />}
          >
            {`Connected: ${account.slice(0, 6)}...`}

          </Menu.Item>
          <Menu.Item
            onClick={() => disconnectWallet()}
            leftSection={<Logout />}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}

export default AccountMenu