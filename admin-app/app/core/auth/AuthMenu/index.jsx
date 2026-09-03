import React from "react"
import { Menu, Text, UnstyledButton } from "@mantine/core"
import { SignOutIcon, WalletIcon } from "@phosphor-icons/react"
import { selectAuth } from "app/core/auth"
import { cn } from "app/core"
import { useSelector } from "react-redux"
import { isLocalChain, selectChain } from "app/core/chain"
import { requestFunds, signOut } from "./actions"


const AuthMenu = () => {
  const { account } = useSelector(() => selectAuth()) || {}
  const { chainId, symbol } = useSelector(() => selectChain()) || {}
  const shortAccount = `${account.slice(0, 6)}…${account.slice(-4)}`
  const showTestFunds = isLocalChain(chainId)

  return (
    <Menu
      className={cn("auth-menu")}
      classNames={{ dropdown: cn("auth-menu-dropdown") }}
      position="bottom-end"
      shadow="md"
    >
      <Menu.Target>
        <UnstyledButton
          className={cn(
            "auth-menu-target",
            "flex min-h-8 flex-col items-end gap-0 rounded-[0.75rem] border border-cs-border bg-cs-surface px-2 py-1",
            "transition-[border-color] hover:border-cs-border-hover"
          )}
          aria-label="Account"
        >
          <Text className={cn("auth-menu-account", "whitespace-nowrap leading-tight")} size="xs" c="dimmed">
            {shortAccount}
          </Text>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {showTestFunds &&
          <Menu.Item
            className={cn("auth-menu-test-funds")}
            onClick={requestFunds}
            leftSection={<WalletIcon size={16} />}
          >
            Get test {symbol}
          </Menu.Item>
        }
        <Menu.Item
          className={cn("auth-menu-logout")}
          onClick={signOut}
          leftSection={<SignOutIcon size={16} />}
        >
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

export default AuthMenu
