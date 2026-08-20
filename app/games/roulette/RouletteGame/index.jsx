import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { fetchRoulette, postRouletteBet, pushSpinHistory, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import RouletteTable from "./RouletteTable"
import { CHIP_VALUES, addEth, chipLabel, clampEth, ethLabel, isTableLocked, MIN_BET, tableMaxBet } from "../chips"
import { BET_COUNT, BLACK_NUMBERS, betWins, maxPotentialPayout } from "../bets"
import { selectNativeSymbol } from "app/core/chain"


const RouletteGame = React.memo(({ address }) => {
  const { t } = useTranslation()
  const [bets, setBets] = React.useState(_.range(BET_COUNT).fill(0))
  const [chip, setChip] = React.useState(CHIP_VALUES[0])
  const [revealing, setRevealing] = React.useState(false)
  const [landingNumber, setLandingNumber] = React.useState(null)
  const [showBanner, setShowBanner] = React.useState(false)
  const [holdingSpin, setHoldingSpin] = React.useState(false)
  const historyRef = React.useRef(null)
  const holdTimer = React.useRef(null)
  const totalBet = clampEth(_.sum(bets))
  const { account } = useSelector(() => selectAuth()) || {}
  const { lastSpin, history = [], minBet, maxBet, totalBalance, locked } = useSelector(() => selectRoulette(address)) || {}
  const symbol = useSelector(() => selectNativeSymbol())
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
  let spinLabel = "Hold to spin"
  if (tableLocked) spinLabel = t("table_locked")
  if (revealing) spinLabel = "Spinning"

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
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2"
      )}
    >
      <div className="flex w-full shrink-0 items-center gap-2">
        <div
          ref={historyRef}
          className={cn(
            "flex min-w-0 flex-1 flex-row items-center gap-1 overflow-x-auto select-none",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {history.length === 0 &&
            <div className="flex h-6 w-7 shrink-0 items-center justify-center rounded-[0.375rem] border-2 border-cs-border bg-cs-elevated" />
          }
          {_.map(_.reverse([...history]), (number, index) => {
            let color = "red"
            if (number === 0) color = "green"
            if (_.includes(BLACK_NUMBERS, number)) color = "black"
            return (
              <div
                key={`${history.length - 1 - index}-${number}`}
                className={cn(
                  "flex h-6 w-7 shrink-0 items-center justify-center rounded-[0.375rem] border-2 border-transparent",
                  "text-[0.75rem] font-medium text-white",
                  color === "green" && "bg-teal-600",
                  color === "red" && "bg-red-600",
                  color === "black" && "bg-gray-700",
                  index === 0 && "border-cs-accent"
                )}
              >
                {number}
              </div>
            )
          })}
        </div>
        <Text size="xs" c="dimmed" className="shrink-0 whitespace-nowrap">
          {ethLabel(totalBet, symbol)}
        </Text>
        {tableLocked &&
          <Text size="xs" c="red" className="shrink-0">
            Locked
          </Text>
        }
      </div>
      <Card className="flex min-h-0 w-full flex-1 flex-col overflow-hidden" padding={0}>
        <div className="flex min-h-0 w-full flex-1 flex-col touch-none p-1.5">
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
      <div className="flex w-full shrink-0 items-center gap-2">
        {!account &&
          <Button className="flex-1" onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account &&
          <>
            <div className="flex shrink-0 flex-row gap-1.5">
              {CHIP_VALUES.map((value) => {
                const isCurrent = value === chip
                if (value > maxBetAmount && !isCurrent) return null
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "size-8 appearance-none rounded-full border-2 border-transparent font-sans text-[0.75rem] font-medium",
                      isCurrent && "border-cs-accent shadow-[0_0_0.75rem_var(--color-cs-accent-glow)]",
                      value === 0.01 && "bg-gray-50 text-dark-900 outline outline-gray-500",
                      value === 0.05 && "bg-red-600 text-white",
                      value === 0.25 && "bg-teal-600 text-white",
                      value === 1 && "bg-cs-elevated text-cs-text outline outline-cs-border",
                      "cursor-pointer disabled:cursor-default disabled:opacity-40"
                    )}
                    aria-label={ethLabel(value, symbol)}
                    aria-pressed={isCurrent}
                    disabled={tableLocked}
                    onClick={() => setChip(value)}
                  >
                    {chipLabel(value)}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className={cn(
                "group relative inline-flex min-h-8 min-w-0 flex-1 appearance-none items-center justify-center overflow-hidden",
                "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
                "leading-normal tracking-[0.06em] uppercase text-cs-text",
                "cursor-pointer touch-none select-none transition-[border-color,color] [-webkit-touch-callout:none]",
                "enabled:hover:border-cs-border-hover enabled:hover:text-cs-accent",
                "disabled:cursor-default disabled:opacity-40",
                "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg"
              )}
              data-holding={holdingSpin}
              disabled={!canSpin}
              onPointerDown={startSpinHold}
              onPointerUp={cancelSpinHold}
              onPointerCancel={cancelSpinHold}
              onLostPointerCapture={cancelSpinHold}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span
                className={cn(
                  "absolute inset-0 w-0 bg-cs-accent transition-[width] duration-150",
                  "group-data-[holding=true]:w-full group-data-[holding=true]:duration-1000",
                  "group-data-[holding=true]:ease-linear"
                )}
              />
              <span className="relative z-[1] truncate">{spinLabel}</span>
            </button>
          </>
        }
      </div>
      {createPortal(
        showBanner &&
          <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner">
            <Card
              className={cn(
                "flex min-w-36 flex-col items-center gap-1 text-center text-white animate-banner",
                bannerColor === "green" && "bg-teal-600",
                bannerColor === "red" && "bg-red-600",
                bannerColor === "black" && "border-cs-border bg-cs-elevated"
              )}
              shadow="md"
              withBorder={false}
            >
              <Text size="sm" className="opacity-80">
                Winning number
              </Text>
              <Text className="font-headings text-[3.5rem] leading-none font-extrabold">
                {winningNumber}
              </Text>
              <Text size="sm">
                Won {ethLabel(winningAmount, symbol)}
              </Text>
            </Card>
          </div>,
        document.body
      )}
    </div>
  )
})

export default RouletteGame
