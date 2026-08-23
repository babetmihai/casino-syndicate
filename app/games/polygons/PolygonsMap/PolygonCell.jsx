import React from "react"
import { ethers } from "ethers"
import { cn } from "app/core"
import {
  BORDER_STROKE,
  LIT_LOSE_FILL,
  LIT_WIN_FILL,
  LOSE_FILL,
  ownerFill,
  SPIN_LOSE_FILL
} from "../polygons"


const PolygonCell = React.memo(({
  cellId,
  path,
  owner,
  isLose,
  mineAddr,
  isFocus,
  isFlash,
  isLit,
  trailRank,
  spinning,
  manyLit,
  celebrate,
  housePop,
  popIndex,
  strokeWidth
}) => {
  const ownerAddr = owner && ethers.getAddress(owner)
  const isMine = Boolean(ownerAddr && mineAddr && ownerAddr === mineAddr)
  const isOccupied = Boolean(owner)
  const isWinPulse = celebrate && owner && !isLose
  const isHousePop = housePop && isLose
  let fill = ownerFill(owner, isMine)
  if (isLose) {
    fill = LOSE_FILL
    if (owner) fill = LIT_LOSE_FILL
  }
  if (isHousePop) fill = LIT_LOSE_FILL
  if (isLit && isLose && !isOccupied && !isHousePop) fill = SPIN_LOSE_FILL
  if (isLit && !isLose && !isOccupied) fill = LIT_WIN_FILL
  if (isFlash && isLose && !isHousePop) fill = LIT_LOSE_FILL
  if (isFlash && !isLose) fill = LIT_WIN_FILL
  let glow = "var(--cs-accent)"
  if (isLose) glow = "var(--cs-accent-2)"
  const showGlow = spinning || isLit || trailRank > 0 || isFlash || isWinPulse || isHousePop
  const flashAnim = isFlash && !manyLit
  let stroke = BORDER_STROKE
  let popDelay = 0
  if (isHousePop && popIndex > 0) popDelay = popIndex * 38
  const popStyle = isHousePop ? { animationDelay: `${popDelay}ms` } : undefined
  const cellClass = cn(
    "polygons-map-cell",
    isLose && "polygons-map-cell-lose",
    isMine && "polygons-map-cell-mine",
    owner && "polygons-map-cell-owned",
    isFocus && "polygons-map-cell-focus",
    isLit && "polygons-map-cell-lit",
    isLit && isOccupied && !isFlash && "polygons-map-cell-occupied animate-map-pass",
    isFlash && "polygons-map-cell-taken",
    flashAnim && "animate-map-taken",
    isWinPulse && !isFlash && "polygons-map-cell-win animate-map-win",
    isHousePop && "polygons-map-cell-pop animate-map-pop"
  )
  let loseAttr
  if (isLose) loseAttr = "1"
  return (
    <g
      className={cn("polygons-map-sector", isLose && "polygons-map-sector-lose")}
      style={popStyle}
    >
      {showGlow &&
        <path
          className={cn(
            "polygons-map-cell-glow",
            "pointer-events-none",
            isLit && "polygons-map-cell-glow-on",
            trailRank === 1 && "polygons-map-cell-glow-1",
            trailRank === 2 && "polygons-map-cell-glow-2",
            trailRank === 3 && "polygons-map-cell-glow-3",
            isFlash && "polygons-map-cell-glow-flash",
            flashAnim && "animate-map-glow-flash",
            isWinPulse && !isFlash && "polygons-map-cell-glow-win animate-map-glow-win",
            isHousePop && "polygons-map-cell-glow-pop animate-map-pop"
          )}
          data-cell-glow={cellId}
          d={path}
          fill={glow}
          style={popStyle}
        />
      }
      <path
        className={cellClass}
        data-cell={cellId}
        data-idle-fill={fill}
        data-lose={loseAttr}
        data-occupied={isOccupied ? "1" : undefined}
        d={path}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        style={popStyle}
      >
        {owner &&
          <title>{owner}</title>
        }
      </path>
    </g>
  )
})

export default PolygonCell
