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
import { CHIP_VALUES, addEth, chipLabel, clampEth, ethLabel, isTableLocked, MIN_BET, tableMaxBet } from "../chips"
import { BET_COUNT, BLACK_NUMBERS, betWins, maxPotentialPayout } from "../bets"
import { PlayIcon, WalletIcon } from "@phosphor-icons/react"
import { AppFab, AppFabs } from "app/components/AppFabs"
import { showModal } from "app/core/modals"
import AuthModal from "app/core/auth/AuthModal"


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(BET_COUNT).fill(0))
  const [chip, setChip] = React.useState(CHIP_VALUES[0])
  const [pickingChip, setPickingChip] = React.useState(false)
  const [revealing, setRevealing] = React.useState(false)
  const [landingNumber, setLandingNumber] = React.useState(null)
  const [showBanner, setShowBanner] = React.useState(false)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const historyRef = React.useRef(null)
  const holdTimer = React.useRef(null)
  const totalBet = clampEth(_.sum(bets))
  const { account } = useSelector(() => selectAuth()) || {}
  const { lastSpin, history = [], minBet, maxBet, totalBalance, locked } = useSelector(() => selectRoulette(address)) || {}
  const { number: winningNumber, winningAmount } = lastSpin || {}
  const showResult = lastSpin && !revealing
  const minBetAmount = clampEth(minBet) || MIN_BET
  const bankroll = clampEth(totalBalance)
  const maxBetAmount = tableMaxBet(maxBet, bankroll)
  const tableLocked = locked || isTableLocked(bankroll, maxBet)
  const canCover = clampEth(maxPotentialPayout(bets)) <= bankroll + totalBet
  const canSpin = totalBet > 0 && !revealing && !showBanner && canCover && !tableLocked
  let bannerColor = "red"
  if (winningNumber === 0) bannerColor = "green"
  if (_.includes(BLACK_NUMBERS, winningNumber)) bannerColor = "black"

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address, account])

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

  const commitBets = (nextBets) => {
    const nextTotal = clampEth(_.sum(nextBets))
    if (clampEth(maxPotentialPayout(nextBets)) > bankroll + nextTotal) return
    setBets(nextBets)
  }

  const changeBet = (index, amount) => {
    if (revealing) return
    if (tableLocked) return
    const nextBets = [...bets]
    let nextValue = addEth(nextBets[index], amount)
    if (amount > 0 && nextValue > 0 && nextValue < minBetAmount) nextValue = minBetAmount
    if (nextValue > maxBetAmount) nextValue = maxBetAmount
    nextBets[index] = nextValue
    commitBets(nextBets)
  }

  const moveChip = (fromIndex, toIndex, value) => {
    if (revealing) return
    if (tableLocked) return
    if (fromIndex === toIndex) return
    const nextBets = [...bets]
    const fromValue = addEth(nextBets[fromIndex], -value)
    const toValue = addEth(nextBets[toIndex], value)
    if (toValue > maxBetAmount) return
    nextBets[fromIndex] = fromValue
    nextBets[toIndex] = toValue
    commitBets(nextBets)
  }

  const cancelSpinHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setHoldingSpin(false)
  }

  const startSpinHold = (event) => {
    if (!canSpin) return
    if (event.button > 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setHoldingSpin(true)
    holdTimer.current = _.delay(async () => {
      holdTimer.current = null
      setHoldingSpin(false)
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
    }, 1000)
  }

  return (
    <div className="RouletteGame_root">
      <div
        ref={historyRef}
        className="RouletteGame_history"
      >
        {history.length === 0 &&
          <div className="RouletteGame_historyItem is-placeholder" />
        }
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
      <Card className="RouletteGame_sheet" padding={0}>
        <div className="RouletteGame_board">
          <RouletteTable
            bets={bets}
            winningNumber={showResult ? winningNumber : undefined}
            landingNumber={landingNumber}
            spinning={revealing}
            disabled={revealing || tableLocked}
            onSpotClick={(index) => changeBet(index, chip)}
            onChipMove={moveChip}
            onChipRemove={(index, value) => changeBet(index, -value)}
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
      <div className="RouletteGame_status">
        <Text size="sm">
          Bet {ethLabel(totalBet)}
        </Text>
        <Text size="sm" c="dimmed">
          Min {ethLabel(minBetAmount)}
        </Text>
        <Text size="sm" c="dimmed">
          Max {ethLabel(maxBetAmount)}
        </Text>
        {tableLocked &&
          <Text size="sm" c="red">
            Table locked
          </Text>
        }
      </div>
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
                Won {ethLabel(winningAmount)}
              </Text>
            </Card>
          </div>,
        document.body
      )}
      <AppFabs>
        {!account &&
          <AppFab
            label="Connect"
            onClick={() => showModal(AuthModal)}
          >
            <WalletIcon size={24} />
          </AppFab>
        }
        {account &&
          <AppFab
            label={tableLocked ? t("table_locked") : t("place_bet")}
            holding={holdingSpin}
            disabled={!canSpin}
            loading={revealing}
            onPointerDown={startSpinHold}
            onPointerUp={cancelSpinHold}
            onPointerCancel={cancelSpinHold}
            onLostPointerCapture={cancelSpinHold}
          >
            <PlayIcon size={24} />
          </AppFab>
        }
        {account && CHIP_VALUES.map((value) => {
          const isCurrent = value === chip
          if (value > maxBetAmount && !isCurrent) return null
          if (!pickingChip && !isCurrent) return null
          return (
            <AppFab
              key={value}
              secondary
              selected={isCurrent}
              className="RouletteGame_chip"
              dataValue={value}
              label={`${value} ETH`}
              disabled={tableLocked}
              onClick={() => {
                if (!pickingChip) {
                  setPickingChip(true)
                  return
                }
                setChip(value)
                setPickingChip(false)
              }}
            >
              {chipLabel(value)}
            </AppFab>
          )
        })}
      </AppFabs>
    </div>
  )
})

export default RouletteGame
