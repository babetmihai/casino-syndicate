import React from "react"
import { createPortal } from "react-dom"
import "./index.scss"
import _ from "lodash"
import { Card, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, postRouletteBet, pushSpinHistory, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import RouletteTable from "./RouletteTable"
import { CHIP_VALUES, MAX_NUMBER_BET } from "../chips"
import { BET_COUNT, BLACK_NUMBERS, betWins } from "../bets"
import { EraserIcon, PlayIcon } from "@phosphor-icons/react"
import { AppFab, AppFabs } from "app/components/AppFabs"


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(BET_COUNT).fill(0))
  const [chip, setChip] = React.useState(1)
  const [pickingChip, setPickingChip] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [landingNumber, setLandingNumber] = React.useState(null)
  const [showBanner, setShowBanner] = React.useState(false)
  const historyRef = React.useRef(null)
  const totalBet = _.sum(bets)
  const { account, balance } = useSelector(() => selectAuth()) || {}
  const { lastSpin, history = [] } = useSelector(() => selectRoulette(address)) || {}
  const { number: winningNumber, winningAmount } = lastSpin || {}
  const showResult = lastSpin && !revealing
  const canSpin = totalBet > 0 && !revealing && !showBanner
  let bannerColor = "red"
  if (winningNumber === 0) bannerColor = "green"
  if (_.includes(BLACK_NUMBERS, winningNumber)) bannerColor = "black"
  let balanceLabel = "0 ETH"
  if (balance) {
    balanceLabel = `${parseInt(balance, 10)} ETH`
  }

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address])

  React.useEffect(() => {
    if (!account) return
    fetchBalance(account)
  }, [account])

  React.useEffect(() => {
    if (!showBanner) return
    const timer = _.delay(() => {
      setShowBanner(false)
      pushSpinHistory(address, winningNumber)
    }, 2500)
    return () => clearTimeout(timer)
  }, [showBanner, winningNumber])

  React.useEffect(() => {
    const node = historyRef.current
    if (!node) return
    node.scrollLeft = 0
  }, [history])

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
        <div className="RouletteGame_rail">
          <div
            ref={historyRef}
            className="RouletteGame_history"
          >
            {_.map(_.reverse([...history]), (number, index) => {
              let color = "red"
              if (number === 0) color = "green"
              if (_.includes(BLACK_NUMBERS, number)) color = "black"
              let className = "RouletteGame_historyItem"
              if (index === 0) className = "RouletteGame_historyItem is-latest"
              return (
                <div
                  key={`${history.length - 1 - index}-${number}`}
                  className={className}
                  data-color={color}
                >
                  {number}
                </div>
              )
            })}
          </div>
          <div className="RouletteGame_hud">
            <Text size="sm" c="dimmed">
              Balance {balanceLabel}
            </Text>
            <Text size="sm">
              Bet {totalBet} ETH
            </Text>
          </div>
        </div>
        <div className="RouletteGame_board">
          <RouletteTable
            bets={bets}
            winningNumber={showResult ? winningNumber : undefined}
            landingNumber={landingNumber}
            spinning={revealing}
            onSpotClick={addBet}
            onReveal={() => {
              setRevealing(false)
              setLandingNumber(null)
              setShowBanner(true)
              const nextBets = _.range(BET_COUNT).fill(0)
              _.forEach(bets, (amount, index) => {
                if (!amount) return
                if (betWins(index, winningNumber)) nextBets[index] = amount
              })
              setBets(nextBets)
            }}
          />
        </div>
      </Card>
      {createPortal(
        showBanner &&
          <div className="RouletteGame_bannerLayer">
            <Card
              className="RouletteGame_banner"
              shadow="md"
              data-color={bannerColor}
            >
              <Text size="sm" className="RouletteGame_bannerLabel">
                Winning number
              </Text>
              <Text className="RouletteGame_bannerNumber">
                {winningNumber}
              </Text>
              <Text size="sm">
                Won {winningAmount} ETH
              </Text>
            </Card>
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
              setRevealing(true)
              setLandingNumber(null)
              try {
                const spin = await postRouletteBet(address, bets)
                if (!spin) {
                  setRevealing(false)
                  return
                }
                setLandingNumber(spin.number)
              } catch {
                setRevealing(false)
                setLandingNumber(null)
                return
              }
              if (account) await fetchBalance(account)
            }}
          >
            <PlayIcon size={24} />
          </AppFab>
          <AppFab
            secondary
            label="Clear"
            disabled={totalBet === 0 || revealing}
            onClick={() => setBets(_.range(BET_COUNT).fill(0))}
          >
            <EraserIcon size={24} />
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
