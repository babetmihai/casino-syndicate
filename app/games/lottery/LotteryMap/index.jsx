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
  seedFromAddress,
  SPIN_LOSE_FILL,
  splitLobes
} from "../polygons"
import { ethers } from "ethers"


const LotteryMap = ({
  address,
  owners = [],
  mates = [],
  bonuses = [],
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = [],
  litIds = [],
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
        const isBonus = Boolean(bonuses[polygon.id])
        const split = Boolean(mate) && !isLose
        let pieces = [{ owner, path: polygon.path }]
        if (split) {
          const lobes = splitLobes(polygon)
          if (lobes.length === 2) {
            pieces = [
              { owner, path: lobes[0].path },
              { owner: mate, path: lobes[1].path }
            ]
          }
        }
        return (
          <g
            key={polygon.id}
            className={cn("lottery-map-cell-group", isBonus && "lottery-map-cell-group-bonus")}
          >
            {_.map(pieces, (piece, pieceIndex) => paintPiece({
              key: `${polygon.id}-${pieceIndex}`,
              path: piece.path,
              owner: piece.owner,
              isLose,
              account,
              isFocus: focusId === polygon.id,
              isFlash: _.includes(flashIds, polygon.id),
              isLit: _.includes(litIds, polygon.id),
              isSplitFlash: _.includes(splitIds, polygon.id),
              celebrate
            }))}
            {isBonus && paintNucleus(polygon)}
          </g>
        )
      })}
    </svg>
  )
}

export default LotteryMap


const paintPiece = ({
  key,
  path,
  owner,
  isLose,
  account,
  isFocus,
  isFlash,
  isLit,
  isSplitFlash,
  celebrate
}) => {
  const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  const isOccupied = Boolean(owner)
  let fill = ownerFill(owner, isMine)
  if (isLose) {
    fill = LOSE_FILL
    if (owner) fill = LIT_LOSE_FILL
  }
  if (isLit && isLose && !isOccupied) fill = SPIN_LOSE_FILL
  if (isLit && !isLose && !isOccupied) fill = LIT_WIN_FILL
  let glow = "var(--cs-accent)"
  if (isLose) glow = "var(--cs-accent-2)"
  const showGlow = isOccupied || isLit
  return (
    <g
      key={key}
      className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose")}
    >
      {showGlow &&
        <path
          className={cn("lottery-map-cell-glow", "pointer-events-none blur-[0.6rem]")}
          d={path}
          fill={glow}
          opacity={0.35}
        />
      }
      {showGlow &&
        <path
          className={cn("lottery-map-cell-glow-core", "pointer-events-none blur-[0.2rem]")}
          d={path}
          fill={glow}
          opacity={0.5}
        />
      }
      <path
        className={cn(
          "lottery-map-cell",
          isLose && "lottery-map-cell-lose",
          isMine && "lottery-map-cell-mine",
          owner && "lottery-map-cell-claimed",
          isFocus && "lottery-map-cell-focus",
          isLit && "lottery-map-cell-lit",
          isLit && isOccupied && "lottery-map-cell-occupied animate-map-pass",
          isFlash && "lottery-map-cell-taken animate-map-taken",
          isSplitFlash && "lottery-map-cell-split animate-map-taken",
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

const paintNucleus = (polygon) => {
  const { id, x, y, r, path } = polygon || {}
  let radius = (r || 0) * 0.16
  if (radius < 0.011) radius = 0.011
  const clipId = `lottery-nucleus-${id}`
  return (
    <g className={cn("lottery-map-nucleus-wrap", "pointer-events-none")}>
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <circle
          className={cn("lottery-map-nucleus-glow", "blur-[0.35rem]")}
          cx={x}
          cy={y}
          r={radius}
          fill="var(--cs-text)"
          opacity={0.28}
        />
        <circle
          className={cn("lottery-map-nucleus")}
          cx={x}
          cy={y}
          r={radius}
          fill="var(--cs-text)"
          stroke="var(--cs-bg)"
          strokeWidth={0.008}
        />
      </g>
    </g>
  )
}
