import React from "react"
import { createPortal } from "react-dom"
import "./index.scss"
import _ from "lodash"
import { Card, Text, ActionIcon, Tooltip } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, postRouletteBet, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import RouletteTable from "./RouletteTable"
import { CHIP_VALUES, MAX_NUMBER_BET } from "../chips"
import { PlayIcon, XIcon } from "@phosphor-icons/react"
import { AppFab, AppFabs } from "app/components/AppFabs"


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(37).fill(0))
  const [chip, setChip] = React.useState(1)
  const [pickingChip, setPickingChip] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [landingNumber, setLandingNumber] = React.useState(null)
  const totalBet = _.sum(bets)
  const { account, balance } = useSelector(() => selectAuth()) || {}
  const { lastSpin } = useSelector(() => selectRoulette(address)) || {}
  const { number: winningNumber, winningAmount } = lastSpin || {}
  const won = lastSpin && Number(winningAmount) > 0
  const showResult = lastSpin && !revealing
  const canSpin = totalBet > 0 && !revealing
  let balanceLabel = "0 ETH"
  if (balance) {
    balanceLabel = `${Number(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETH`
  }

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  const addBet = (number) => {
    if (revealing) return
    const nextBets = [...bets]
    const nextValue = nextBets[number] + chip
    if (nextValue > MAX_NUMBER_BET) return
    nextBets[number] = nextValue
    setBets(nextBets)
  }

  return (
    <div className="RouletteGame_root">
      <Card className="RouletteGame_sheet" padding={0}>
        <div className="RouletteGame_board">
          <RouletteTable
            bets={bets}
            winningNumber={showResult ? winningNumber : undefined}
            landingNumber={landingNumber}
            spinning={revealing}
            onNumberClick={addBet}
            onReveal={() => {
              setRevealing(false)
              setLandingNumber(null)
            }}
          />
        </div>
      </Card>
      {createPortal(
        <div className="RouletteGame_hud">
          <Text size="sm" c="dimmed">
            Balance {balanceLabel}
          </Text>
          <div className="RouletteGame_hudBet">
            <Text size="sm">
              Bet {totalBet} ETH
            </Text>
            {totalBet > 0 && !revealing &&
              <Tooltip
                label="Clear"
                withArrow
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Clear"
                  onClick={() => setBets(_.range(37).fill(0))}
                >
                  <XIcon size={18} />
                </ActionIcon>
              </Tooltip>
            }
          </div>
          {showResult && won &&
            <Text size="sm" c="teal">
              Won {winningAmount} ETH · {winningNumber}
            </Text>
          }
          {showResult && !won &&
            <Text size="sm" c="dimmed">
              No win · {winningNumber}
            </Text>
          }
        </div>,
        document.body
      )}
      {account &&
        <AppFabs>
          <AppFab
            label={t("place_bet")}
            disabled={!canSpin}
            loading={revealing}
            onClick={async () => {
              let spin
              setRevealing(true)
              setLandingNumber(null)
              try {
                spin = await postRouletteBet(address, bets)
                if (spin) setLandingNumber(spin.number)
                if (account) await fetchBalance(account)
              } finally {
                if (!spin) setRevealing(false)
              }
            }}
          >
            <PlayIcon size={24} />
          </AppFab>
          {CHIP_VALUES.map((value) => {
            const isCurrent = value === chip
            if (!pickingChip && !isCurrent) return null
            return (
              <AppFab
                key={value}
                secondary
                selected={isCurrent}
                className="RouletteGame_chip"
                dataValue={value}
                label={`${value} chip`}
                onClick={() => {
                  if (!pickingChip) {
                    setPickingChip(true)
                    return
                  }
                  setChip(value)
                  setPickingChip(false)
                }}
              >
                {value}
              </AppFab>
            )
          })}
        </AppFabs>
      }
    </div>
  )
})

export default RouletteGame
