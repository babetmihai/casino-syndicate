import React from "react"
import "./index.scss"
import _ from "lodash"
import { Button, Card, Text, UnstyledButton } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, postRouletteBet, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import RouletteTable from "./RouletteTable"
import { CHIP_VALUES, MAX_NUMBER_BET } from "../chips"


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(37).fill(0))
  const [chip, setChip] = React.useState(1)
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
        <div className="RouletteGame_top">
          <div className="RouletteGame_status">
            <Text size="sm" c="dimmed">
              Balance {balanceLabel}
            </Text>
            <Text size="sm">
              Bet {totalBet} ETH
            </Text>
            {totalBet > 0 && !revealing &&
              <Button
                variant="subtle"
                onClick={() => setBets(_.range(37).fill(0))}
              >
                Clear
              </Button>
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
        </div>
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
        <div className="RouletteGame_dock">
          <div className="RouletteGame_chips">
            {CHIP_VALUES.map((value) => (
              <UnstyledButton
                key={value}
                className="RouletteGame_chip"
                data-value={value}
                data-selected={chip === value}
                aria-label={`${value} chip`}
                aria-pressed={chip === value}
                onClick={() => setChip(value)}
              >
                {value}
              </UnstyledButton>
            ))}
          </div>
          <Button
            className="RouletteGame_place"
            size="lg"
            loading={revealing}
            disabled={!canSpin}
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
            {t("place_bet")}
          </Button>
        </div>
      </Card>
    </div>
  )
})

export default RouletteGame
