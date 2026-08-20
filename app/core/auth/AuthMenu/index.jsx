import React from "react"
import "./index.scss"
import { Menu, Avatar, UnstyledButton } from "@mantine/core"
import { SignOutIcon, WalletIcon } from "@phosphor-icons/react"
import { selectAuth, logout, fetchBalance, requestTestEth } from "app/core/auth"
import { chipsLabel } from "app/games/roulette/chips"
import { useSelector } from "react-redux"


const AuthMenu = () => {
  const { account, balance } = useSelector(() => selectAuth()) || {}
  const initials = account.replace(/\d/g, "").toUpperCase().slice(0, 2)
  const shortAccount = `${account.slice(0, 6)}…${account.slice(-4)}`
  const balanceLabel = chipsLabel(parseInt(balance, 10) || 0)

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  return (
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
          leftSection={<WalletIcon size={16} />}
        >
          Get test ETH
        </Menu.Item>
        <Menu.Item
          onClick={() => logout()}
          leftSection={<SignOutIcon size={16} />}
        >
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export default AuthMenu
