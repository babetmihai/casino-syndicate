import React from "react"
import { createPortal } from "react-dom"
import _ from "lodash"
import { Button, Card, Text } from "@mantine/core"
import { fetchRoulette, selectRoulette } from ".."
import { useSelector } from "react-redux"
import { fetchBalance, selectAuth } from "app/core/auth"
import { showModal } from "app/core/modals"
import { cn } from "app/core"
import AuthModal from "app/core/auth/AuthModal"
import SessionModal from "app/core/auth/SessionModal"
import RouletteTable from "./RouletteTable"
import { CHIP_VALUES, bankrollClass, chipLabel, clampEth, ethLabel, MIN_BET, tableMaxBet } from "../chips"
import { BLACK_NUMBERS } from "../bets"
import { selectNativeSymbol } from "app/core/chain"
import {
  canSpinRoulette,
  cancelSpinHold,
  changeBet,
  finishReveal,
  moveChip,
  resetHideResult,
  setChip,
  startSpinHold,
  unmountRouletteGame
} from "./actions"


const RouletteGame = React.memo(({ address }) => {
  const { account, session } = useSelector(() => selectAuth()) || {}
  const { authorized } = session || {}
  const roulette = useSelector(() => selectRoulette(address)) || {}
  const {
    lastSpin, history = {}, minBet, maxBet, totalBalance, bets = {}, chip = CHIP_VALUES[0],
    revealing, landingNumber, showBanner, holdingSpin, hideResult
  } = roulette
  const symbol = useSelector(() => selectNativeSymbol())
  const { number: winningNumber, winningAmount } = lastSpin || {}
  const spinning = revealing || holdingSpin
  const showResult = lastSpin && !spinning && !hideResult
  const bankroll = clampEth(totalBalance)
  const minBetAmount = clampEth(minBet) || MIN_BET
  const maxBetAmount = tableMaxBet(maxBet)
  const canSpin = canSpinRoulette(address)
  let bannerColor = "red"
  if (winningNumber === 0) bannerColor = "green"
  if (_.includes(BLACK_NUMBERS, winningNumber)) bannerColor = "black"
  let spinLabel = "Hold to spin"
  if (revealing) spinLabel = "Spinning"
  const historySpins = _.orderBy(Object.values(history), (item) => Number(item.id), "desc")
  const historyRef = React.useRef(null)

  React.useEffect(() => {
    resetHideResult(address)
  }, [address])

  React.useEffect(() => {
    fetchRoulette(address)
  }, [address, account])

  React.useEffect(() => {
    if (!account) return
    fetchBalance()
  }, [account])

  React.useEffect(() => {
    return () => unmountRouletteGame(address)
  }, [address])

  React.useEffect(() => {
    const node = historyRef.current
    if (!node) return
    node.scrollLeft = 0
  }, [history])

  return (
    <div
      className={cn(
        "roulette-game",
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pt-2 select-none",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))] gap-2"
      )}
    >
      <div className={cn("roulette-status", "flex w-full shrink-0 items-center gap-2")}>
        <div
          ref={historyRef}
          className={cn(
            "roulette-history",
            "flex min-w-0 flex-1 flex-row items-center gap-1 overflow-x-auto select-none",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {_.isEmpty(history) &&
            <div
              className={cn(
                "roulette-history-empty",
                "flex h-6 w-7 shrink-0 items-center justify-center rounded-[0.375rem] border-2 border-cs-border bg-cs-elevated"
              )}
            />
          }
          {_.map(historySpins, (item, index) => {
            const { id, number } = item || {}
            let color = "red"
            if (number === 0) color = "green"
            if (_.includes(BLACK_NUMBERS, number)) color = "black"
            return (
              <div
                key={id}
                className={cn(
                  "roulette-history-number",
                  `roulette-history-${color}`,
                  index === 0 && "roulette-history-latest",
                  "flex h-6 w-7 shrink-0 items-center justify-center rounded-[0.375rem] border-2 border-transparent",
                  "text-[0.75rem] font-medium text-white",
                  color === "green" && "bg-teal-600",
                  color === "red" && "bg-red-600",
                  color === "black" && "bg-gray-700",
                  index === 0 && "border-cs-accent animate-chip-drop"
                )}
              >
                {number}
              </div>
            )
          })}
        </div>
        <div className={cn("roulette-status-meta", "flex shrink-0 items-center gap-2")}>
          <Text className={cn("roulette-limits", "whitespace-nowrap")} size="xs" c="dimmed">
            {clampEth(minBetAmount)}–{ethLabel(maxBetAmount, symbol)}
          </Text>
          <Text className={cn("roulette-bankroll", "whitespace-nowrap", bankrollClass(bankroll, maxBet))} size="xs">
            {ethLabel(bankroll, symbol)}
          </Text>
        </div>
      </div>
      <Card className={cn("roulette-table-card", "flex min-h-0 w-full flex-1 flex-col overflow-hidden")} padding={0}>
        <div className={cn("roulette-table-frame", "flex min-h-0 w-full flex-1 flex-col touch-none p-1.5")}>
          <RouletteTable
            bets={bets}
            winningNumber={showResult ? winningNumber : undefined}
            landingNumber={landingNumber}
            spinning={spinning}
            holding={holdingSpin}
            disabled={spinning}
            onSpotClick={(index) => changeBet(address, index, chip)}
            onChipMove={(fromIndex, toIndex, value) => moveChip(address, fromIndex, toIndex, value)}
            onChipRemove={(index, value) => changeBet(address, index, -value)}
            onReveal={() => finishReveal(address)}
          />
        </div>
      </Card>
      <div className={cn("roulette-controls", "flex w-full shrink-0 items-center gap-2")}>
        {!account &&
          <Button className={cn("roulette-connect", "flex-1")} onClick={() => showModal(AuthModal)}>
            Connect
          </Button>
        }
        {account && !authorized &&
          <Button className={cn("roulette-deposit", "flex-1")} onClick={() => showModal(SessionModal)}>
            Deposit
          </Button>
        }
        {authorized &&
          <>
            <div className={cn("roulette-chips", "flex shrink-0 flex-row gap-1.5")}>
              {_.map(CHIP_VALUES, (value) => {
                const isCurrent = value === chip
                if (value > maxBetAmount && !isCurrent) return null
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "roulette-chip",
                      isCurrent && "roulette-chip-selected",
                      "size-8 appearance-none rounded-full border-2 border-transparent font-sans text-[0.75rem] font-medium",
                      "transition-[border-color,box-shadow,transform] duration-200",
                      isCurrent && "border-cs-accent shadow-[0_0_0.75rem_var(--color-cs-accent-glow)] scale-[1.06]",
                      value === 0.01 && "bg-gray-50 text-dark-900 outline outline-gray-500",
                      value === 0.05 && "bg-red-600 text-white",
                      value === 0.25 && "bg-teal-600 text-white",
                      value === 1 && "bg-cs-elevated text-cs-text outline outline-cs-border",
                      "cursor-pointer disabled:cursor-default disabled:opacity-40"
                    )}
                    aria-label={ethLabel(value, symbol)}
                    aria-pressed={isCurrent}
                    onClick={() => setChip(address, value)}
                  >
                    {chipLabel(value)}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className={cn(
                "roulette-spin",
                "group relative inline-flex min-h-8 min-w-0 flex-1 appearance-none items-center justify-center overflow-hidden",
                "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
                "leading-normal tracking-[0.06em] uppercase text-cs-text",
                "cursor-pointer touch-manipulation touch-none select-none [-webkit-touch-callout:none]",
                "enabled:hover:border-cs-border-hover enabled:hover:text-cs-accent",
                "disabled:cursor-default",
                !revealing && "disabled:opacity-40",
                "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg",
                "data-[spinning=true]:border-cs-accent data-[spinning=true]:text-cs-bg"
              )}
              data-holding={holdingSpin}
              data-spinning={revealing}
              disabled={!canSpin && !holdingSpin && !revealing}
              onPointerDown={(event) => startSpinHold(address, event)}
              onPointerUp={() => cancelSpinHold(address)}
              onPointerCancel={() => cancelSpinHold(address)}
              onLostPointerCapture={() => cancelSpinHold(address)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span
                className={cn(
                  "roulette-spin-fill",
                  "absolute inset-0 w-0 bg-cs-accent transition-[width] duration-150",
                  "group-data-[holding=true]:w-full group-data-[holding=true]:duration-1000",
                  "group-data-[holding=true]:ease-linear",
                  "group-data-[spinning=true]:w-full group-data-[spinning=true]:duration-200"
                )}
              />
              <span className={cn("roulette-spin-label", "relative z-[1] truncate")}>{spinLabel}</span>
            </button>
          </>
        }
      </div>
      {createPortal(
        showBanner &&
          <div className={cn("roulette-banner", "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner")}>
            <Card
              className={cn(
                "roulette-banner-card",
                `roulette-banner-${bannerColor}`,
                "flex min-w-36 flex-col items-center gap-1 text-center text-white animate-banner-card",
                bannerColor === "green" && "bg-teal-600",
                bannerColor === "red" && "bg-red-600",
                bannerColor === "black" && "border-cs-border bg-cs-elevated"
              )}
              shadow="md"
              withBorder={false}
            >
              <Text className={cn("roulette-banner-label", "opacity-80")} size="sm">
                Winning number
              </Text>
              <Text className={cn("roulette-banner-number", "font-headings text-[3.5rem] leading-none font-extrabold")}>
                {winningNumber}
              </Text>
              <Text className={cn("roulette-banner-win")} size="sm">
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
