import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { buildPolygons, cellNumber, LIT_LOSE_FILL, LIT_LOSE_STROKE, LIT_WIN_FILL, LIT_WIN_STROKE, LOSE_FILL, LOSE_STROKE, ownerFill, ownerStroke, polygonCentroid, seedFromAddress } from "../polygons"
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
        let strokeWidth = 2
        if (isFocus) strokeWidth = 2.5
        if (isFlash) strokeWidth = 2.5
        if (isLit) strokeWidth = 2.5
        if (celebrate && owner) strokeWidth = 2.5
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
        if (isLit && isLose) {
          fill = LIT_LOSE_FILL
          stroke = LIT_LOSE_STROKE
        }
        if (isLit && !isLose) {
          fill = LIT_WIN_FILL
          stroke = LIT_WIN_STROKE
        }
        const points = _.map(polygon.points, (point) => point.join(",")).join(" ")
        const center = polygonCentroid(polygon.points)
        let numberFill = "var(--cs-text)"
        if (isLose) numberFill = "rgb(248 113 113 / 0.72)"
        if ((isMine || isLit) && !isLose) numberFill = "var(--cs-bg)"
        return (
          <g
            key={polygon.id}
            className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose")}
          >
            <polygon
              className={cn(
                "lottery-map-cell",
                isLose && "lottery-map-cell-lose",
                isMine && "lottery-map-cell-mine",
                owner && "lottery-map-cell-claimed",
                isFocus && "lottery-map-cell-focus",
                isLit && "lottery-map-cell-lit",
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
            <text
              className={cn("lottery-map-number", isLose && "lottery-map-number-lose", "pointer-events-none select-none")}
              x={center[0]}
              y={center[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="0.038"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fill={numberFill}
            >
              {cellNumber(polygon.id, winCount)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default LotteryMap
