import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { buildPolygons, ownerFill, ownerStroke, seedFromAddress } from "../polygons"
import { ethers } from "ethers"


const LotteryMap = ({ address, owners = [], polygonCount, account, focusId, flashIds = [], celebrate }) => {
  const count = polygonCount || owners.length
  const polygons = React.useMemo(() => {
    if (!address || !count) return []
    return buildPolygons(seedFromAddress(address), count)
  }, [address, count])

  return (
    <svg
      className={cn("lottery-map", "block size-full")}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
    >
      {_.map(polygons, (polygon) => {
        const owner = owners[polygon.id]
        const isMine = owner && account && ethers.getAddress(owner) === ethers.getAddress(account)
        const isFocus = focusId === polygon.id
        const isFlash = _.includes(flashIds, polygon.id)
        let strokeWidth = 1.25
        if (isFocus) strokeWidth = 2.5
        if (isFlash) strokeWidth = 2.5
        if (celebrate && owner) strokeWidth = 2.5
        const points = _.map(polygon.points, (point) => point.join(",")).join(" ")
        return (
          <polygon
            key={polygon.id}
            className={cn(
              "lottery-map-cell",
              isMine && "lottery-map-cell-mine",
              owner && "lottery-map-cell-claimed",
              isFocus && "lottery-map-cell-focus",
              isFlash && "lottery-map-cell-taken animate-map-taken",
              celebrate && owner && "lottery-map-cell-win animate-map-win"
            )}
            points={points}
            fill={ownerFill(owner, isMine)}
            stroke={ownerStroke(owner, isMine)}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          >
            {owner &&
              <title>{owner}</title>
            }
          </polygon>
        )
      })}
    </svg>
  )
}

export default LotteryMap
