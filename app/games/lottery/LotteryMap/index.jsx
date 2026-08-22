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
import { BONUS_NOVA, BONUS_SPARK } from ".."
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
  freshBonusIds = [],
  spinning,
  celebrate,
  quiet
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
        const bonusKind = bonuses[polygon.id] || 0
        const isBonus = bonusKind > 0
        const split = Boolean(mate) && !isLose
        const trailRank = _.indexOf(litIds, polygon.id)
        const isLit = trailRank === 0
        const isFlash = _.includes(flashIds, polygon.id)
        const isSplitFlash = _.includes(splitIds, polygon.id)
        let pieces = [{ owner, path: polygon.path }]
        let nucleus = polygon
        if (split) {
          const lobes = splitLobes(polygon)
          if (lobes.length === 2) {
            const ownerLobe = lobes[0] || {}
            const center = ownerLobe.center || []
            pieces = [
              { owner, path: ownerLobe.path },
              { owner: mate, path: lobes[1].path }
            ]
            nucleus = {
              ...polygon,
              path: ownerLobe.path,
              points: ownerLobe.points,
              raw: ownerLobe.points,
              x: center[0],
              y: center[1]
            }
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
              isFlash,
              isLit,
              trailRank,
              isSplitFlash,
              celebrate
            }))}
            {isBonus && paintNucleus(nucleus, !quiet && _.includes(freshBonusIds, polygon.id), bonusKind, quiet)}
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

const paintNucleus = (polygon, isFresh, kind, quiet) => {
  const { id, x, y, path, points, raw } = polygon || {}
  const source = raw || points || []
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
  const isSpark = kind === BONUS_SPARK
  const isNova = kind === BONUS_NOVA
  let radius = inner * 0.4
  if (isSpark) radius = inner * 0.22
  if (isNova) radius = inner * 0.55
  if (radius > inner - pad) radius = inner - pad
  if (radius <= 0) return
  let fill = "var(--cs-text)"
  if (isSpark) fill = "var(--cs-accent-2)"
  if (isNova) fill = "var(--cs-accent)"
  let glowR = radius * 1.7
  if (isNova) glowR = radius * 2.2
  let glowOpacity = 0.22
  if (isSpark) glowOpacity = 0.14
  if (isNova) glowOpacity = 0.4
  const clipId = `lottery-nucleus-${id}`
  return (
    <g className={cn("lottery-map-nucleus-wrap", "pointer-events-none")}>
      <clipPath id={clipId}>
        <path d={path} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <circle
          className={cn(
            "lottery-map-nucleus-glow",
            isSpark && "lottery-map-nucleus-glow-spark",
            isNova && "lottery-map-nucleus-glow-nova",
            isFresh && "lottery-map-nucleus-glow-fresh"
          )}
          cx={x}
          cy={y}
          r={glowR}
          fill={fill}
          opacity={glowOpacity}
        />
        <circle
          className={cn(
            "lottery-map-nucleus",
            isSpark && "lottery-map-nucleus-spark",
            isNova && "lottery-map-nucleus-nova",
            isFresh && "lottery-map-nucleus-fresh",
            !quiet && !isFresh && "animate-nucleus"
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
