import React from "react"
import "./index.scss"
import { Menu, Avatar } from "@mantine/core"
import { Logout } from "tabler-icons-react"
import { selectChain } from "app/core/chain"
import { useSelector } from "react-redux"
import chain from "app/core/chain"

const AccountMenu = () => {
  const { account } = useSelector(() => selectChain())
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
        <Menu.Dropdown>
          <Menu.Label>
            {`Connected: ${account.slice(0, 8)}...`}
          </Menu.Label>
          <Menu.Item
            onClick={() => chain.unset()}
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