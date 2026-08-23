import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { NUCLEUS_ID, nucleusWeight, splitLobes } from "../polygons"
import PolygonCell from "./PolygonCell"


const PolygonCellGroup = ({
  polygon,
  owner,
  mate,
  winCount,
  mineAddr,
  isFocus,
  isFlash,
  isLit,
  trailRank,
  isSplitFlash,
  spinning,
  manyLit,
  celebrate,
  housePop
}) => {
  const isNucleus = polygon.id === NUCLEUS_ID
  const isLose = polygon.id >= winCount
  const popIndex = polygon.id - winCount
  const split = Boolean(mate) && !isLose
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
    <g className={cn("polygons-map-cell-group", isNucleus && "polygons-map-cell-nucleus")}>
      {_.map(pieces, (piece, pieceIndex) => {
        return (
          <PolygonCell
            key={`${polygon.id}-${pieceIndex}`}
            clipId={`polygons-nucleus-${polygon.id}-${pieceIndex}`}
            cellId={polygon.id}
            path={piece.path}
            x={piece.x}
            y={piece.y}
            points={piece.points}
            owner={piece.owner}
            isLose={isLose}
            isNucleus={isNucleus}
            nucleusWeight={nucleusWeight(winCount)}
            mineAddr={mineAddr}
            isFocus={isFocus}
            isFlash={isFlash}
            isLit={isLit}
            trailRank={trailRank}
            isSplitFlash={isSplitFlash}
            spinning={spinning}
            manyLit={manyLit}
            celebrate={celebrate}
            housePop={housePop}
            popIndex={popIndex}
          />
        )
      })}
    </g>
  )
}


const groupEqual = (prev, next) => {
  if (prev.spinning && next.spinning) {
    return prev.owner === next.owner
      && prev.mate === next.mate
      && prev.isFlash === next.isFlash
      && prev.isSplitFlash === next.isSplitFlash
      && prev.polygon === next.polygon
      && prev.winCount === next.winCount
      && prev.mineAddr === next.mineAddr
  }
  return prev.polygon === next.polygon
    && prev.owner === next.owner
    && prev.mate === next.mate
    && prev.winCount === next.winCount
    && prev.mineAddr === next.mineAddr
    && prev.isFocus === next.isFocus
    && prev.isFlash === next.isFlash
    && prev.isLit === next.isLit
    && prev.trailRank === next.trailRank
    && prev.isSplitFlash === next.isSplitFlash
    && prev.spinning === next.spinning
    && prev.manyLit === next.manyLit
    && prev.celebrate === next.celebrate
    && prev.housePop === next.housePop
}


export default React.memo(PolygonCellGroup, groupEqual)
