import React from "react"
import "./index.scss"
import { Menu, Avatar, Text, UnstyledButton } from "@mantine/core"
import { Logout, Wallet } from "tabler-icons-react"
import { selectAuth, logout, fetchBalance, requestTestEth } from "app/core/auth"
import { useSelector } from "react-redux"


const AuthMenu = () => {
  const { account, balance } = useSelector(() => selectAuth()) || {}
  const initials = account.replace(/\d/g, "").toUpperCase().slice(0, 2)
  const shortAccount = `${account.slice(0, 6)}…${account.slice(-4)}`
  let balanceLabel = "0 ETH"
  if (balance) {
    balanceLabel = `${Number(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETH`
  }

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  return (
    <div className="AuthMenu_root">
      <Text size="sm" c="dimmed" visibleFrom="sm">
        {balanceLabel}
      </Text>
      <Menu position="bottom-end" shadow="md">
        <Menu.Target>
          <UnstyledButton className="AuthMenu_target" aria-label="Account">
            <Avatar size="md" radius="xl" color="indigo">
              {initials}
            </Avatar>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{shortAccount}</Menu.Label>
          <Menu.Label>{balanceLabel}</Menu.Label>
          <Menu.Item
            onClick={() => requestTestEth()}
            leftSection={<Wallet size={16} />}
          >
            Get test ETH
          </Menu.Item>
          <Menu.Item
            onClick={() => logout()}
            leftSection={<Logout size={16} />}
          >
            Log out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}

export default AuthMenu
