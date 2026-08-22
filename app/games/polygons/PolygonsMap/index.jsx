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
  polygonCount,
  loseCount = 0,
  account,
  focusId,
  flashIds = [],
  litIds = [],
  splitIds = [],
  spinning,
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
      className={cn(
        "lottery-map",
        spinning && "lottery-map-spinning",
        "block aspect-square h-auto overflow-hidden"
      )}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
    >
      {_.map(polygons, (polygon) => {
        const isLose = polygon.id >= winCount
        const owner = owners[polygon.id]
        const mate = mates[polygon.id]
        const split = Boolean(mate) && !isLose
        const trailRank = _.indexOf(litIds, polygon.id)
        const isLit = trailRank === 0
        const isFlash = _.includes(flashIds, polygon.id)
        const isSplitFlash = _.includes(splitIds, polygon.id)
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
            className={cn("lottery-map-cell-group")}
          >
            {_.map(pieces, (piece, pieceIndex) => paintPiece({
              key: `${polygon.id}-${pieceIndex}`,
              path: piece.path,
              owner: piece.owner,
              isLose,
              account,
              isFocus: focusId === polygon.id,
              isFlash,
              isLit,
              trailRank,
              isSplitFlash,
              celebrate
            }))}
          </g>
        )
      })}
    </svg>
  )
}

export default React.memo(LotteryMap)


const paintPiece = ({
  key,
  path,
  owner,
  isLose,
  account,
  isFocus,
  isFlash,
  isLit,
  trailRank,
  isSplitFlash,
  celebrate
}) => {
  const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  const isOccupied = Boolean(owner)
  const isWinPulse = celebrate && owner && !isLose
  let fill = ownerFill(owner, isMine)
  if (isLose) {
    fill = LOSE_FILL
    if (owner) fill = LIT_LOSE_FILL
  }
  if (isLit && isLose && !isOccupied) fill = SPIN_LOSE_FILL
  if (isLit && !isLose && !isOccupied) fill = LIT_WIN_FILL
  let glow = "var(--cs-accent)"
  if (isLose) glow = "var(--cs-accent-2)"
  const showGlow = isLit || trailRank > 0 || isFlash || isSplitFlash || isWinPulse
  return (
    <g
      key={key}
      className={cn("lottery-map-sector", isLose && "lottery-map-sector-lose")}
    >
      {showGlow &&
        <path
          className={cn(
            "lottery-map-cell-glow",
            "pointer-events-none",
            isLit && "lottery-map-cell-glow-on",
            trailRank === 1 && "lottery-map-cell-glow-1",
            trailRank === 2 && "lottery-map-cell-glow-2",
            trailRank === 3 && "lottery-map-cell-glow-3",
            isFlash && "lottery-map-cell-glow-flash animate-map-glow-flash",
            isWinPulse && !isFlash && "lottery-map-cell-glow-win animate-map-glow-win"
          )}
          d={path}
          fill={glow}
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
          isLit && isOccupied && !isFlash && "lottery-map-cell-occupied animate-map-pass",
          isFlash && "lottery-map-cell-taken animate-map-taken",
          isSplitFlash && "lottery-map-cell-split animate-map-taken",
          isWinPulse && !isFlash && "lottery-map-cell-win animate-map-win"
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
