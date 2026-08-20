import React from "react"
import { initTable, selectTable, TABLE_TYPES } from "app/core/tables"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"
import AppScreen from "app/components/AppScreen"
import RouletteGame from "app/games/roulette/RouletteGame"
import { selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import AuthModal from "app/core/auth/AuthModal"
import { AppFab } from "app/components/AppFabs"
import { WalletIcon } from "@phosphor-icons/react"


const GameScreen = () => {
  const { address } = useParams()
  const table = useSelector(() => selectTable(address))
  const { account } = useSelector(() => selectAuth())

  React.useEffect(() => {
    if (!address) return
    initTable(address)
  }, [address])

  const { type } = table || {}

  return (
    <AppScreen
      name={type}
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
