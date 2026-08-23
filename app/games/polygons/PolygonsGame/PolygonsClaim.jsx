import React from "react"
import { Button } from "@mantine/core"
import { cn } from "app/core"


const PolygonsClaim = React.memo(({ show, claiming, label, onClaim }) => {
  if (!show) return
  return (
    <div className={cn("polygons-claim-wrap", "absolute inset-0 z-10 flex items-center justify-center bg-cs-bg")}>
      <Button
        className={cn("polygons-claim", "animate-claim min-w-36")}
        loading={claiming}
        onClick={onClaim}
      >
        Claim {label}
      </Button>
    </div>
  )
})

export default PolygonsClaim
