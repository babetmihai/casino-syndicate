import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import {
  BORDER_STROKE,
  BORDER_WIDTH,
  buildPolygons,
  LIT_LOSE_FILL,
  LIT_WIN_FILL,
  LOSE_FILL,
  ownerFill,
  plusFill,
  seedFromAddress,
  SPIN_LOSE_FILL,
  splitLobes
} from "../polygons"
import { ethers } from "ethers"


const LotteryMap = ({
  address,
  owners = [],
  mates = [],
  pluses = [],
  matePluses = [],
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = [],
  litIds = [],
  plusIds = [],
  splitIds = [],
  celebrate
}) => {
  const winCount = polygonCount || 0
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
        const mate = mates[polygon.id]
        const split = Boolean(mate) && !isLose
        let pieces = [{ owner, plus: pluses[polygon.id] || 0, path: polygon.path, center: [polygon.x, polygon.y] }]
        if (split) {
          const lobes = splitLobes(polygon)
          if (lobes.length === 2) {
            pieces = [
              { owner, plus: pluses[polygon.id] || 0, path: lobes[0].path, center: lobes[0].center },
              { owner: mate, plus: matePluses[polygon.id] || 0, path: lobes[1].path, center: lobes[1].center }
            ]
          }
        }
        return _.map(pieces, (piece, pieceIndex) => paintPiece({
          key: `${polygon.id}-${pieceIndex}`,
          path: piece.path,
          owner: piece.owner,
          plus: piece.plus,
          isLose,
          account,
          isFocus: focusId === polygon.id,
          isFlash: _.includes(flashIds, polygon.id),
          isPlusFlash: _.includes(plusIds, polygon.id),
          isLit: _.includes(litIds, polygon.id),
          isSplitFlash: _.includes(splitIds, polygon.id),
          celebrate
        }))
      })}
      {_.map(polygons, (polygon) => {
        if (polygon.id >= winCount) return null
        const owner = owners[polygon.id]
        const mate = mates[polygon.id]
        const labels = [{ owner, plus: pluses[polygon.id] || 0, center: [polygon.x, polygon.y] }]
        if (mate) {
          const lobes = splitLobes(polygon)
          if (lobes.length === 2) {
            labels[0].center = lobes[0].center
            labels.push({ owner: mate, plus: matePluses[polygon.id] || 0, center: lobes[1].center })
          }
        }
        return _.map(labels, (label, labelIndex) => {
          if (!label.owner || !account || !label.plus) return null
          const isMine = ethers.getAddress(label.owner) === ethers.getAddress(account)
          if (!isMine) return null
          const isPlusFlash = _.includes(plusIds, polygon.id)
          return (
            <text
              key={`n-${polygon.id}-${labelIndex}`}
              className={cn(
                "lottery-map-plus",
                `lottery-map-plus-${label.plus}`,
                isPlusFlash && "lottery-map-plus-flash",
                "pointer-events-none select-none"
              )}
              x={label.center[0]}
              y={label.center[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={_.clamp(0.22 / Math.sqrt(count), 0.02, 0.055)}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontWeight={700}
              fill="#0a0e14"
            >
              {`+${label.plus}`}
            </text>
          )
        })
      })}
    </svg>
  )
}

export default LotteryMap


const paintPiece = ({
  key,
  path,
  owner,
  plus,
  isLose,
  account,
  isFocus,
  isFlash,
  isPlusFlash,
  isLit,
  isSplitFlash,
  celebrate
}) => {
  const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  const shownPlus = isMine ? plus : 0
  const isOccupied = Boolean(owner)
  let fill = ownerFill(owner, isMine)
  if (shownPlus) fill = plusFill(shownPlus, isMine)
  if (isLose) {
    fill = LOSE_FILL
    if (owner) fill = LIT_LOSE_FILL
  }
  if (isLit && isLose && !isOccupied) fill = SPIN_LOSE_FILL
  if (isLit && !isLose && !isOccupied) fill = LIT_WIN_FILL
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
      key={key}
      className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose", shownPlus && `lottery-map-sector-plus-${shownPlus}`)}
    >
      {showGlow &&
        <path
          className={cn("lottery-map-cell-glow", "pointer-events-none blur-[0.6rem]")}
          d={path}
          fill={glow}
          opacity={glowOpacity}
        />
      }
      {showGlow &&
        <path
          className={cn("lottery-map-cell-glow-core", "pointer-events-none blur-[0.2rem]")}
          d={path}
          fill={glow}
          opacity={shownPlus ? 0.65 : 0.5}
        />
      }
      <path
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
          isSplitFlash && "lottery-map-cell-split animate-map-taken",
          plusAnim,
          celebrate && owner && !isLose && "lottery-map-cell-win animate-map-win"
        )}
        d={path}
        fill={fill}
        stroke={BORDER_STROKE}
        strokeWidth={BORDER_WIDTH}
        strokeLinejoin="miter"
        strokeMiterlimit={2}
      >
        {owner &&
          <title>{owner}</title>
        }
      </path>
    </g>
  )
}
