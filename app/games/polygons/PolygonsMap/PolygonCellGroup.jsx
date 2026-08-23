import React from "react"
import { cn } from "app/core"
import PolygonCell from "./PolygonCell"


const PolygonCellGroup = ({
  polygon,
  owner,
  winCount,
  mineAddr,
  isFocus,
  isFlash,
  isLit,
  trailRank,
  spinning,
  manyLit,
  celebrate,
  housePop,
  strokeWidth
}) => {
  const isLose = polygon.id >= winCount
  const popIndex = polygon.id - winCount
  return (
    <g className={cn("polygons-map-cell-group")}>
      <PolygonCell
        cellId={polygon.id}
        path={polygon.path}
        owner={owner}
        isLose={isLose}
        mineAddr={mineAddr}
        isFocus={isFocus}
        isFlash={isFlash}
        isLit={isLit}
        trailRank={trailRank}
        spinning={spinning}
        manyLit={manyLit}
        celebrate={celebrate}
        housePop={housePop}
        popIndex={popIndex}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}


const groupEqual = (prev, next) => {
  if (prev.spinning && next.spinning) {
    return prev.owner === next.owner
      && prev.isFlash === next.isFlash
      && prev.polygon === next.polygon
      && prev.winCount === next.winCount
      && prev.mineAddr === next.mineAddr
  }
  return prev.polygon === next.polygon
    && prev.owner === next.owner
    && prev.winCount === next.winCount
    && prev.mineAddr === next.mineAddr
    && prev.isFocus === next.isFocus
    && prev.isFlash === next.isFlash
    && prev.isLit === next.isLit
    && prev.trailRank === next.trailRank
    && prev.spinning === next.spinning
    && prev.manyLit === next.manyLit
    && prev.celebrate === next.celebrate
    && prev.housePop === next.housePop
    && prev.strokeWidth === next.strokeWidth
}


export default React.memo(PolygonCellGroup, groupEqual)
