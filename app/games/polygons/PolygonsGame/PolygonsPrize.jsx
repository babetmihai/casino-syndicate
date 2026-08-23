import React from "react"
import { cn } from "app/core"


const PolygonsPrize = React.memo(({ label }) => {
  return (
    <div className={cn("polygons-prize", "flex h-[1.25rem] shrink-0 items-center justify-center")}>
      <span className={cn("polygons-prize-value", "font-headings text-[1rem] font-extrabold leading-none tabular-nums text-cs-accent")}>
        {label}
      </span>
    </div>
  )
})

export default PolygonsPrize
