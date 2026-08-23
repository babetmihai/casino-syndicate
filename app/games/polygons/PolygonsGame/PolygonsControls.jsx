import React from "react"
import _ from "lodash"
import { Button } from "@mantine/core"
import { TICKET_MULTIPLIERS } from ".."
import { cn } from "app/core"
import { showModal } from "app/core/modals"
import AuthModal from "app/core/auth/AuthModal"
import SessionModal from "app/core/auth/SessionModal"


const PolygonsControls = React.memo(({
  account,
  authorized,
  pending,
  multiplier,
  buying,
  revealing,
  holdingSpin,
  canSpin,
  spinLabel,
  onMultiplier,
  onSpinDown,
  onSpinUp
}) => {
  return (
    <div className={cn("polygons-controls", "flex w-full shrink-0 flex-wrap items-center gap-2")}>
      {!account &&
        <Button className={cn("polygons-connect", "flex-1")} onClick={() => showModal(AuthModal)}>
          Connect
        </Button>
      }
      {account && !authorized &&
        <Button className={cn("polygons-deposit", "flex-1")} onClick={() => showModal(SessionModal)}>
          Deposit
        </Button>
      }
      {authorized && !pending &&
        <div className={cn("polygons-multipliers", "flex shrink-0 flex-row gap-1.5")}>
          {_.map(TICKET_MULTIPLIERS, (value) => {
            const isCurrent = value === multiplier
            return (
              <button
                key={value}
                type="button"
                className={cn(
                  "polygons-multiplier",
                  isCurrent && "polygons-multiplier-selected",
                  "size-8 min-w-8 w-auto px-1.5 appearance-none rounded-[0.75rem] border-2 border-transparent font-sans text-[0.75rem] font-medium",
                  "bg-cs-elevated text-cs-text outline outline-cs-border",
                  isCurrent && "border-cs-accent text-cs-accent shadow-[0_0_0.75rem_var(--color-cs-accent-glow)]",
                  "cursor-pointer disabled:cursor-default disabled:opacity-40 disabled:shadow-none"
                )}
                aria-pressed={isCurrent}
                disabled={buying || revealing || holdingSpin}
                onClick={() => onMultiplier(value)}
              >
                x{value}
              </button>
            )
          })}
        </div>
      }
      {authorized && !pending &&
        <button
          type="button"
          className={cn(
            "polygons-spin",
            "group relative inline-flex min-h-8 min-w-0 flex-1 appearance-none items-center justify-center overflow-hidden",
            "rounded-[0.75rem] border border-cs-border bg-transparent px-3 py-2 font-sans text-[0.75rem]",
            "leading-normal tracking-[0.06em] uppercase text-cs-text",
            "cursor-pointer touch-manipulation touch-none select-none [-webkit-touch-callout:none]",
            "enabled:hover:data-[holding=false]:data-[spinning=false]:border-cs-border-hover",
            "enabled:hover:data-[holding=false]:data-[spinning=false]:text-cs-accent",
            "disabled:cursor-default",
            !revealing && "disabled:opacity-40",
            "data-[holding=true]:border-cs-accent data-[holding=true]:text-cs-bg",
            "data-[spinning=true]:border-cs-accent data-[spinning=true]:text-cs-bg"
          )}
          data-holding={holdingSpin}
          data-spinning={revealing}
          disabled={!canSpin && !holdingSpin && !revealing}
          onPointerDown={onSpinDown}
          onPointerUp={onSpinUp}
          onPointerCancel={onSpinUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span
            className={cn(
              "polygons-spin-fill",
              "absolute inset-0 w-0 bg-cs-accent transition-[width] duration-150",
              "group-data-[holding=true]:w-full group-data-[holding=true]:duration-1000",
              "group-data-[holding=true]:ease-linear",
              "group-data-[spinning=true]:w-full group-data-[spinning=true]:duration-200"
            )}
          />
          <span className={cn("polygons-spin-label", "relative z-[1]")}>{spinLabel}</span>
        </button>
      }
    </div>
  )
})

export default PolygonsControls
