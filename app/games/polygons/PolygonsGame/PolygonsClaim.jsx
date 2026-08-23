import React from "react"
import { Button } from "@mantine/core"
import { cn } from "app/core"


const PolygonsClaim = React.memo(({ show, loading, label, onClick }) => {
  if (!show) return
  return (
    <div
      className={cn(
        "polygons-claim-wrap",
        "absolute inset-0 z-10 flex items-center justify-center bg-cs-bg/35 animate-overlay-in"
      )}
    >
      <Button
        className={cn("polygons-claim", "animate-claim min-w-36")}
        loading={loading}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  )
})

export default PolygonsClaim
