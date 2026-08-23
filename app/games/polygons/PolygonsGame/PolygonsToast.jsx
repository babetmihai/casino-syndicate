import React from "react"
import { createPortal } from "react-dom"
import { Card, Text } from "@mantine/core"
import { cn } from "app/core"


const PolygonsToast = React.memo(({ beat, revealing, hero, house }) => {
  return createPortal(
    beat && !revealing &&
      <div
        className={cn(
          "polygons-toast",
          house && "polygons-toast-house",
          "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-cs-bg/72 animate-banner"
        )}
      >
        <Card
          className={cn(
            "polygons-toast-card",
            "relative z-[1] flex min-w-36 flex-col items-center gap-1 rounded-[0.75rem] px-6 py-4 text-center",
            "animate-banner-card border-transparent text-cs-bg",
            house && "polygons-toast-house bg-cs-accent-2",
            !house && "polygons-toast-hit bg-cs-accent"
          )}
          shadow="md"
          withBorder={false}
        >
          <Text className={cn("polygons-toast-label", "opacity-80")} size="sm">
            {beat}
          </Text>
          {hero &&
            <Text className={cn("polygons-toast-number", "font-headings text-[1.75rem] leading-none font-extrabold")}>
              {hero}
            </Text>
          }
        </Card>
      </div>,
    document.body
  )
})

export default PolygonsToast
