import React from "react"
import _ from "lodash"
import { cn } from "app/core"
import { BORDER_WIDTH } from "../polygons"


const NucleusMark = React.memo(({ clipId, path, x, y, points, isMine, isFresh }) => {
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
  let radius = inner * 0.22
  if (radius > inner - pad) radius = inner - pad
  if (radius <= 0) return
  let fill = "var(--cs-accent)"
  if (isMine) fill = "var(--cs-bg)"
  const glowR = radius * 1.45
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
          strokeWidth={0.006}
        />
      </g>
    </g>
  )
})

export default NucleusMark
