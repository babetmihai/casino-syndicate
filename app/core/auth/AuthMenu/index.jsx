import React from "react"
import { Menu, Text, UnstyledButton } from "@mantine/core"
import { ArrowUpIcon, SignOutIcon, VaultIcon, WalletIcon } from "@phosphor-icons/react"
import { selectAuth, selectPendingBet, logout, fetchBalance, requestTestEth } from "app/core/auth"
import SessionModal from "app/core/auth/SessionModal"
import SessionWithdrawModal from "app/core/auth/SessionWithdrawModal"
import { showModal } from "app/core/modals"
import { clampEth, ethLabel } from "app/games/roulette/chips"
import { cn } from "app/core"
import { useSelector } from "react-redux"
import { isLocalChain, selectChain } from "app/core/chain"


const AuthMenu = () => {
  const { account, balance, session } = useSelector(() => selectAuth()) || {}
  const pendingBet = useSelector(() => selectPendingBet())
  const { chainId, symbol } = useSelector(() => selectChain()) || {}
  const { authorized } = session || {}
  const shortAccount = `${account.slice(0, 6)}…${account.slice(-4)}`
  const deposited = clampEth(balance)
  let playBalance = deposited - clampEth(pendingBet)
  if (playBalance < 0) playBalance = 0
  const balanceLabel = ethLabel(playBalance, symbol)
  const showTestFunds = isLocalChain(chainId)
  const showWithdraw = authorized && deposited > 0

  React.useEffect(() => {
    if (!account) return
    fetchBalance()
  }, [account, chainId])

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
          <Text className={cn("auth-menu-balance", "whitespace-nowrap text-[0.75rem] leading-tight text-cs-accent")} size="xs">
            {balanceLabel}
          </Text>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          className={cn("auth-menu-deposit")}
          onClick={() => showModal(SessionModal)}
          leftSection={<VaultIcon size={16} />}
        >
          Deposit
        </Menu.Item>
        {showWithdraw &&
          <Menu.Item
            className={cn("auth-menu-withdraw")}
            onClick={() => showModal(SessionWithdrawModal)}
            leftSection={<ArrowUpIcon size={16} />}
          >
            Withdraw
          </Menu.Item>
        }
        {showTestFunds &&
          <Menu.Item
            className={cn("auth-menu-test-funds")}
            onClick={() => requestTestEth()}
            leftSection={<WalletIcon size={16} />}
          >
            Get test {symbol}
          </Menu.Item>
        }
        <Menu.Item
          className={cn("auth-menu-logout")}
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
