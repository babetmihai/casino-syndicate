import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import { ActionIcon, Tooltip } from "@mantine/core"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"
import { selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import AuthModal from "app/core/auth/AuthModal"
import { AppFab } from "app/components/AppFabs"
import { GearIcon, WalletIcon } from "@phosphor-icons/react"
import history from "app/core/history"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const { account } = useSelector(() => selectAuth())

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { name, type } = table || {}

  return (
    <AppScreen
      name={name || type}
      action={
        <Tooltip label="Manage" position="bottom" withArrow>
          <ActionIcon
            color="gray"
            size="lg"
            aria-label="Manage"
            onClick={() => history.push(`/tables/${address}/admin`)}
          >
            <GearIcon size={22} />
          </ActionIcon>
        </Tooltip>
      }
      fabs={!account && (
        <AppFab
          label="Connect"
          onClick={() => showModal(AuthModal)}
        >
          <WalletIcon size={24} />
        </AppFab>
      )}
    >
      {type === TABLE_TYPES.Roulette &&
        <RouletteGame address={address} />
      }
    </AppScreen>
  )
}

export default GameScreen
