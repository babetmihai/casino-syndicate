import React from "react"
import "./index.scss"
import _ from "lodash"
import BettingSpot from "./BettingSpot"
import BettingChip from "./BettingChip"
import { Button, Card, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, postRouletteBet, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { clearLoader, setLoader, useLoader } from "app/core/loaders"

const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 19, 20, 22, 24, 26, 28, 29, 31, 33, 35]


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(37).fill(0))
  const totalBet = _.sum(bets)
  const postingBet = useLoader("postingBet")
  const { lastSpin } = useSelector(() => selectRoulette(address)) || {}
  const { number: winningNumber, winningAmount } = lastSpin || {}
  const won = lastSpin && Number(winningAmount) > 0
  const canSpin = totalBet > 0 && !postingBet

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  return (
    <div className="RouletteGame_root">
      <div className="RouletteGame_toolbar">
        <Text size="sm" c="dimmed">
          Bet {totalBet} ETH
        </Text>
        <div className="RouletteGame_actions">
          {totalBet > 0 &&
            <Button
              variant="subtle"
              onClick={() => setBets(_.range(37).fill(0))}
            >
              Clear
            </Button>
          }
          <Button
            loading={postingBet}
            disabled={!canSpin}
            onClick={async () => {
              setLoader("postingBet")
              try {
                await postRouletteBet(address, bets)
              } finally {
                clearLoader("postingBet")
              }
            }}
          >
            {t("place_bet")}
          </Button>
        </div>
      </div>
      {lastSpin &&
        <Card className="RouletteGame_result">
          <Text fw={500}>
            Winning number {winningNumber}
          </Text>
          {won &&
            <Text size="sm" c="teal">
              Won {winningAmount} ETH
            </Text>
          }
          {!won &&
            <Text size="sm" c="dimmed">
              No win
            </Text>
          }
        </Card>
      }
      <Card className="RouletteGame_table">
        <svg viewBox="0 0 30 130">
          {_.range(37).map((number) => (
            <RouletteSpot
              key={number}
              number={number}
              bets={bets}
              setBets={setBets}
              winner={lastSpin && winningNumber === number}
            />
          ))}
        </svg>
      </Card>
    </div>
  )
})

const RouletteSpot = React.memo(({ number, bets, setBets, winner }) => {
  const x = ((number - 1) % 3)
  const y = Math.floor((number - 1) / 3) + 1
  const isZero = number === 0
  let color = "red"
  if (isZero) color = "green"
  if (BLACK_NUMBERS.includes(number)) color = "black"
  const hasBet = bets[number] > 0

  const addBet = () => {
    const nextBets = [...bets]
    nextBets[number] += 1
    setBets(nextBets)
  }

  const spotProps = {}
  if (number === 36) spotProps.bottomRightRadius = 2
  if (number === 34) spotProps.bottomLeftRadius = 2
  if (isZero) {
    spotProps.x = 0
    spotProps.y = 0
    spotProps.width = 3
    spotProps.height = 1
    spotProps.topRightRadius = 2
    spotProps.topLeftRadius = 2
  }

  return (
    <g>
      <BettingSpot
        x={x}
        y={y}
        color={color}
        label={number}
        onClick={addBet}
        winner={winner}
        {...spotProps}
      />
      {hasBet &&
        <BettingChip
          x={isZero ? 1 : x}
          y={y}
          value={bets[number]}
          onClick={addBet}
          {...spotProps}
        />
      }
    </g>
  )
})

export default RouletteGame
