import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import {
  buildPolygons,
  LIT_LOSE_FILL,
  LIT_LOSE_STROKE,
  LIT_WIN_FILL,
  LIT_WIN_STROKE,
  LOSE_FILL,
  LOSE_STROKE,
  ownerFill,
  ownerStroke,
  plusFill,
  polygonCentroid,
  seedFromAddress,
  SPIN_LOSE_FILL,
  SPIN_LOSE_STROKE
} from "../polygons"
import { ethers } from "ethers"


const LotteryMap = ({
  address,
  owners = [],
  pluses = [],
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = [],
  litIds = [],
  plusIds = [],
  celebrate
}) => {
  const winCount = polygonCount || owners.length
  const count = winCount + (loseCount || 0)
  const polygons = React.useMemo(() => {
    if (!address || !count) return []
    return buildPolygons(seedFromAddress(address), count, winCount)
  }, [address, count, winCount])

  return (
    <svg
      className={cn("lottery-map", "block size-full")}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
    >
      {_.map(polygons, (polygon) => {
        const isLose = polygon.id >= winCount
        const owner = owners[polygon.id]
        const plus = pluses[polygon.id] || 0
        const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
        const shownPlus = isMine ? plus : 0
        const isFocus = focusId === polygon.id
        const isFlash = _.includes(flashIds, polygon.id)
        const isPlusFlash = shownPlus && _.includes(plusIds, polygon.id)
        const isLit = _.includes(litIds, polygon.id)
        const isOccupied = Boolean(owner)
        let strokeWidth = 2
        if (isOccupied || isLit) strokeWidth = 2.5
        if (shownPlus) strokeWidth = 2 + shownPlus * 0.4
        if (isLit && !isOccupied) strokeWidth = 3
        if (isFocus || isFlash || isPlusFlash) strokeWidth = 2.5
        let fill = ownerFill(owner, isMine)
        let stroke = ownerStroke(owner, isMine)
        if (shownPlus) fill = plusFill(shownPlus, isMine)
        if (isLose) {
          fill = LOSE_FILL
          stroke = LOSE_STROKE
          if (owner) {
            fill = LIT_LOSE_FILL
            stroke = LIT_LOSE_STROKE
          }
        }
        if (isLit && isLose && !isOccupied) {
          fill = SPIN_LOSE_FILL
          stroke = SPIN_LOSE_STROKE
        }
        if (isLit && !isLose && !isOccupied) {
          fill = LIT_WIN_FILL
          stroke = LIT_WIN_STROKE
        }
        const points = _.map(polygon.points, (point) => point.join(",")).join(" ")
        let glow = "var(--cs-accent)"
        if (isLose) glow = "var(--cs-accent-2)"
        if (shownPlus === 2) glow = "#5eead4"
        if (shownPlus === 3) glow = "#fbbf24"
        const showGlow = isOccupied || isLit
        let glowOpacity = 0.35
        if (shownPlus === 1) glowOpacity = 0.42
        if (shownPlus === 2) glowOpacity = 0.55
        if (shownPlus === 3) glowOpacity = 0.72
        let plusAnim
        if (isPlusFlash && shownPlus === 1) plusAnim = "lottery-map-cell-plus-1 animate-map-plus-1"
        if (isPlusFlash && shownPlus === 2) plusAnim = "lottery-map-cell-plus-2 animate-map-plus-2"
        if (isPlusFlash && shownPlus === 3) plusAnim = "lottery-map-cell-plus-3 animate-map-plus-3"
        return (
          <g
            key={polygon.id}
            className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose", shownPlus && `lottery-map-sector-plus-${shownPlus}`)}
          >
            {showGlow &&
              <polygon
                className={cn("lottery-map-cell-glow", "pointer-events-none blur-[0.6rem]")}
                points={points}
                fill={glow}
                opacity={glowOpacity}
              />
            }
            {showGlow &&
              <polygon
                className={cn("lottery-map-cell-glow-core", "pointer-events-none blur-[0.2rem]")}
                points={points}
                fill={glow}
                opacity={shownPlus ? 0.65 : 0.5}
              />
            }
            <polygon
              className={cn(
                "lottery-map-cell",
                isLose && "lottery-map-cell-lose",
                isMine && "lottery-map-cell-mine",
                owner && "lottery-map-cell-claimed",
                shownPlus && `lottery-map-cell-plus lottery-map-cell-plus-${shownPlus}`,
                isFocus && "lottery-map-cell-focus",
                isLit && "lottery-map-cell-lit",
                isLit && isOccupied && "lottery-map-cell-occupied animate-map-pass",
                isFlash && "lottery-map-cell-taken animate-map-taken",
                plusAnim,
                celebrate && owner && !isLose && "lottery-map-cell-win animate-map-win"
              )}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            >
              {owner &&
                <title>{owner}</title>
              }
            </polygon>
          </g>
        )
      })}
      {_.map(polygons, (polygon) => {
        if (polygon.id >= winCount) return null
        const owner = owners[polygon.id]
        if (!owner || !account) return null
        const isMine = ethers.getAddress(owner) === ethers.getAddress(account)
        const plus = pluses[polygon.id] || 0
        if (!isMine || !plus) return null
        const center = polygonCentroid(polygon.points)
        const isPlusFlash = _.includes(plusIds, polygon.id)
        return (
          <text
            key={`n-${polygon.id}`}
            className={cn(
              "lottery-map-plus",
              `lottery-map-plus-${plus}`,
              isPlusFlash && "lottery-map-plus-flash",
              "pointer-events-none select-none"
            )}
            x={center[0]}
            y={center[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={_.clamp(0.22 / Math.sqrt(count), 0.02, 0.055)}
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontWeight={700}
            fill="#0a0e14"
          >
            {`+${plus}`}
          </text>
        )
      })}
    </svg>
  )
}

export default LotteryMap
