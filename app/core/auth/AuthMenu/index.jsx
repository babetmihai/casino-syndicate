import React from "react"
import "./index.scss"
import { Menu, Avatar } from "@mantine/core"
import { Logout, Wallet } from "tabler-icons-react"
import { selectAuth, logout, fetchBalance, requestTestEth } from "app/core/auth"
import { useSelector } from "react-redux"


const AuthMenu = () => {
  const { account, balance } = useSelector(() => selectAuth()) || {}

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  return (
    <div className="AuthMenu_root">
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
            {`${account.slice(0, 8)}...`}
          </Menu.Label>
          <Menu.Label>
            {balance ? `${balance} ETH` : "Balance unavailable"}
          </Menu.Label>
          <Menu.Item
            onClick={() => requestTestEth()}
            leftSection={<Wallet />}
          >
            Get test ETH
          </Menu.Item>
          <Menu.Item
            onClick={() => logout()}
            leftSection={<Logout />}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}

export default AuthMenu
