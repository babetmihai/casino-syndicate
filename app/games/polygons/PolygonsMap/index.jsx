import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import {
  BORDER_STROKE,
  BORDER_WIDTH,
  buildPolygons,
  NUCLEUS_ID,
  NUCLEUS_WEIGHT,
  LIT_LOSE_FILL,
  LIT_WIN_FILL,
  LOSE_FILL,
  ownerFill,
  seedFromAddress,
  SPIN_LOSE_FILL,
  splitLobes
} from "../polygons"
import { ethers } from "ethers"


const PolygonsMap = ({
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
  celebrate,
  housePop
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
        "polygons-map",
        spinning && "polygons-map-spinning",
        "block aspect-square h-auto overflow-hidden"
      )}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
    >
      {_.map(polygons, (polygon) => {
        const isNucleus = polygon.id === NUCLEUS_ID
        const isLose = polygon.id >= winCount
        const popIndex = polygon.id - winCount
        const owner = owners[polygon.id]
        const mate = mates[polygon.id]
        const split = Boolean(mate) && !isLose
        const trailRank = _.indexOf(litIds, polygon.id)
        const isLit = trailRank === 0
        const isFlash = _.includes(flashIds, polygon.id)
        const isSplitFlash = _.includes(splitIds, polygon.id)
        let pieces = [{ owner, path: polygon.path, x: polygon.x, y: polygon.y, points: polygon.raw || polygon.points }]
        if (split) {
          const lobes = splitLobes(polygon)
          if (lobes.length === 2) {
            pieces = [
              { owner, path: lobes[0].path, x: lobes[0].center[0], y: lobes[0].center[1], points: lobes[0].points },
              { owner: mate, path: lobes[1].path, x: lobes[1].center[0], y: lobes[1].center[1], points: lobes[1].points }
            ]
          }
        }
        return (
          <g
            key={polygon.id}
            className={cn("polygons-map-cell-group", isNucleus && "polygons-map-cell-nucleus")}
          >
            {_.map(pieces, (piece, pieceIndex) => paintPiece({
              key: `${polygon.id}-${pieceIndex}`,
              clipId: `polygons-nucleus-${polygon.id}-${pieceIndex}`,
              path: piece.path,
              x: piece.x,
              y: piece.y,
              points: piece.points,
              owner: piece.owner,
              isLose,
              isNucleus,
              account,
              isFocus: focusId === polygon.id,
              isFlash,
              isLit,
              trailRank,
              isSplitFlash,
              celebrate,
              housePop,
              popIndex
            }))}
          </g>
        )
      })}
    </svg>
  )
}

export default React.memo(PolygonsMap)


const paintPiece = ({
  key,
  clipId,
  path,
  x,
  y,
  points,
  owner,
  isLose,
  isNucleus,
  account,
  isFocus,
  isFlash,
  isLit,
  trailRank,
  isSplitFlash,
  celebrate,
  housePop,
  popIndex
}) => {
  const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
  const isOccupied = Boolean(owner)
  const isWinPulse = celebrate && owner && !isLose
  const isHousePop = housePop && isLose
  let fill = ownerFill(owner, isMine, isNucleus)
  if (isLose) {
    fill = LOSE_FILL
    if (owner) fill = LIT_LOSE_FILL
  }
  if (isHousePop) fill = LIT_LOSE_FILL
  if (isLit && isLose && !isOccupied && !isHousePop) fill = SPIN_LOSE_FILL
  if (isLit && !isLose && !isOccupied) fill = LIT_WIN_FILL
  let glow = "var(--cs-accent)"
  if (isLose) glow = "var(--cs-accent-2)"
  const showGlow = isLit || trailRank > 0 || isFlash || isSplitFlash || isWinPulse || isHousePop
  let stroke = BORDER_STROKE
  let strokeWidth = BORDER_WIDTH
  let popDelay = 0
  if (isHousePop && popIndex > 0) popDelay = popIndex * 38
  const popStyle = isHousePop ? { animationDelay: `${popDelay}ms` } : undefined
  const cellClass = cn(
    "polygons-map-cell",
    isLose && "polygons-map-cell-lose",
    isNucleus && "polygons-map-cell-nucleus-fill",
    isMine && "polygons-map-cell-mine",
    owner && "polygons-map-cell-owned",
    isFocus && "polygons-map-cell-focus",
    isLit && "polygons-map-cell-lit",
    isLit && isOccupied && !isFlash && "polygons-map-cell-occupied animate-map-pass",
    isFlash && "polygons-map-cell-taken animate-map-taken",
    isSplitFlash && "polygons-map-cell-split animate-map-taken",
    isWinPulse && !isFlash && "polygons-map-cell-win animate-map-win",
    isHousePop && "polygons-map-cell-pop animate-map-pop"
  )
  return (
    <g
      key={key}
      className={cn("polygons-map-sector", isLose && "polygons-map-sector-lose", isNucleus && "polygons-map-sector-nucleus")}
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
            isFlash && "polygons-map-cell-glow-flash animate-map-glow-flash",
            isWinPulse && !isFlash && "polygons-map-cell-glow-win animate-map-glow-win",
            isHousePop && "polygons-map-cell-glow-pop animate-map-pop"
          )}
          d={path}
          fill={glow}
          style={popStyle}
        />
      }
      <path
        className={cellClass}
        d={path}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeMiterlimit={2}
        style={popStyle}
      >
        {isNucleus &&
          <title>Nucleus · {NUCLEUS_WEIGHT}×</title>
        }
        {owner && !isNucleus &&
          <title>{owner}</title>
        }
      </path>
      {isNucleus && paintNucleus({
        clipId,
        path,
        x,
        y,
        points,
        isMine,
        isFresh: isFlash || isSplitFlash
      })}
    </g>
  )
}


const paintNucleus = ({ clipId, path, x, y, points, isMine, isFresh }) => {
  const source = points || []
  let inner
  _.forEach(source, (cur, i) => {
    const next = source[(i + 1) % source.length]
    const dx = next[0] - cur[0]
    const dy = next[1] - cur[1]
    const len = Math.hypot(dx, dy)
    if (len < 1e-12) return
    const d = Math.abs((x - cur[0]) * dy - (y - cur[1]) * dx) / len
    if (!_.isNumber(inner) || d < inner) inner = d
  })
  if (!inner) return
  const pad = BORDER_WIDTH / 2 + 0.006
  let radius = inner * 0.24
  if (radius > inner - pad) radius = inner - pad
  if (radius <= 0) return
  let fill = "var(--cs-accent)"
  if (isMine) fill = "var(--cs-bg)"
  const glowR = radius * 1.55
  return (
    <g className={cn("polygons-map-nucleus-wrap", "pointer-events-none")}>
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <circle
          className={cn(
            "polygons-map-nucleus-glow",
            isFresh && "polygons-map-nucleus-glow-fresh"
          )}
          cx={x}
          cy={y}
          r={glowR}
          fill={fill}
          opacity={0.22}
        />
        <circle
          className={cn(
            "polygons-map-nucleus",
            isFresh && "polygons-map-nucleus-fresh",
            !isFresh && "animate-nucleus"
          )}
          cx={x}
          cy={y}
          r={radius}
          fill={fill}
          stroke="var(--cs-bg)"
          strokeWidth={0.008}
        />
      </g>
    </g>
  )
}
