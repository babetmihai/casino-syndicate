import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { ownerFill } from "../polygons"


const PolygonsRace = React.memo(({ players, mineKey, polygonCount, lastGreen, lastHouse, housePct }) => {
  return (
    <div className={cn("polygons-race", "flex min-w-0 flex-1 flex-col gap-1")}>
      <div className={cn("polygons-race-players", lastGreen && "polygons-race-hot")}>
        <div className={cn("polygons-race-track", "polygons-race-track-players", "flex h-1 overflow-hidden rounded-full bg-cs-elevated")}>
          {_.map(players, (row) => {
            const isMine = mineKey && row.key === mineKey
            return (
              <div
                key={row.key}
                className={cn(
                  "polygons-race-fill",
                  "polygons-race-fill-player",
                  lastGreen && "polygons-race-fill-hot animate-race-hot",
                  "h-full shrink-0"
                )}
                style={{
                  width: `${(row.amount / polygonCount) * 100}%`,
                  background: ownerFill(row.key, isMine)
                }}
              />
            )
          })}
        </div>
      </div>
      <div className={cn("polygons-race-house", lastHouse && "polygons-race-hot")}>
        <div className={cn("polygons-race-track", "h-1 overflow-hidden rounded-full bg-cs-elevated")}>
          <div
            className={cn(
              "polygons-race-fill",
              "polygons-race-fill-house",
              lastHouse && "polygons-race-fill-hot animate-race-hot",
              "h-full bg-cs-accent-2 transition-[width] duration-300"
            )}
            style={{ width: `${housePct}%` }}
          />
        </div>
      </div>
    </div>
  )
})

export default PolygonsRace
