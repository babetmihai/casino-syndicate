import React from "react"
import { Menu, Text, UnstyledButton } from "@mantine/core"
import { SignOutIcon, WalletIcon } from "@phosphor-icons/react"
import { selectAuth, logout, fetchBalance, requestTestEth } from "app/core/auth"
import { ethLabel } from "app/games/roulette/chips"
import { cn } from "app/core"
import { useSelector } from "react-redux"


const AuthMenu = () => {
  const { account, balance } = useSelector(() => selectAuth()) || {}
  const shortAccount = `${account.slice(0, 6)}…${account.slice(-4)}`
  const balanceLabel = ethLabel(balance)

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  return (
    <Menu position="bottom-end" shadow="md">
      <Menu.Target>
        <UnstyledButton
          className={cn(
            "flex min-h-8 flex-col items-end gap-0 rounded-[0.75rem] border border-cs-border bg-cs-surface px-2 py-1",
            "transition-[border-color] hover:border-cs-border-hover"
          )}
          aria-label="Account"
        >
          <Text size="xs" c="dimmed" className="whitespace-nowrap leading-tight">
            {shortAccount}
          </Text>
          <Text size="xs" className="whitespace-nowrap text-[0.75rem] leading-tight text-cs-accent">
            {balanceLabel}
          </Text>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{shortAccount}</Menu.Label>
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
