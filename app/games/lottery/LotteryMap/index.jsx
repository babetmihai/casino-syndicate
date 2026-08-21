import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { buildPolygons, cellNumber, LIT_LOSE_FILL, LIT_LOSE_STROKE, LIT_WIN_FILL, LIT_WIN_STROKE, LOSE_FILL, LOSE_STROKE, ownerFill, ownerStroke, polygonCentroid, seedFromAddress, SPIN_LOSE_FILL, SPIN_LOSE_STROKE } from "../polygons"
import { ethers } from "ethers"


const LotteryMap = ({ address, owners = [], polygonCount, loseCount = 0, account, focusId, flashIds = [], litIds = [], celebrate }) => {
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
        const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
        const isFocus = focusId === polygon.id
        const isFlash = _.includes(flashIds, polygon.id)
        const isLit = _.includes(litIds, polygon.id)
        const isOccupied = Boolean(owner)
        let strokeWidth = 2
        if (isOccupied || isLit) strokeWidth = 2.5
        if (isLit && !isOccupied) strokeWidth = 3
        if (isFocus || isFlash) strokeWidth = 2.5
        let fill = ownerFill(owner, isMine)
        let stroke = ownerStroke(owner, isMine)
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
        const showGlow = isOccupied || isLit
        return (
          <g
            key={polygon.id}
            className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose")}
          >
            {showGlow &&
              <polygon
                className={cn("lottery-map-cell-glow", "pointer-events-none blur-[0.6rem]")}
                points={points}
                fill={glow}
                opacity={0.35}
              />
            }
            {showGlow &&
              <polygon
                className={cn("lottery-map-cell-glow-core", "pointer-events-none blur-[0.2rem]")}
                points={points}
                fill={glow}
                opacity={0.5}
              />
            }
            <polygon
              className={cn(
                "lottery-map-cell",
                isLose && "lottery-map-cell-lose",
                isMine && "lottery-map-cell-mine",
                owner && "lottery-map-cell-claimed",
                isFocus && "lottery-map-cell-focus",
                isLit && "lottery-map-cell-lit",
                isLit && isOccupied && "lottery-map-cell-occupied animate-map-pass",
                isFlash && "lottery-map-cell-taken animate-map-taken",
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
        if (!owner) return null
        const isMine = account && ethers.getAddress(owner) === ethers.getAddress(account)
        const center = polygonCentroid(polygon.points)
        let numberFill = "#eef2f6"
        if (isMine) numberFill = "#0a0e14"
        return (
          <text
            key={`n-${polygon.id}`}
            className={cn("lottery-map-number", "pointer-events-none select-none")}
            x={center[0]}
            y={center[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={_.clamp(0.22 / Math.sqrt(count), 0.02, 0.045)}
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fill={numberFill}
          >
            {cellNumber(polygon.id)}
          </text>
        )
      })}
    </svg>
  )
}

export default LotteryMap
