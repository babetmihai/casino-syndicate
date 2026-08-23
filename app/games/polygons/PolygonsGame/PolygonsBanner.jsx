import React from "react"
import { createPortal } from "react-dom"
import { Card, Text } from "@mantine/core"
import { cn } from "app/core"


const PolygonsBanner = React.memo(({ show, revealing, playersWon, label, hero, cardAnim, heroClass }) => {
  return createPortal(
    show && !revealing && playersWon && label &&
      <div
        className={cn(
          "polygons-banner",
          "pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
        )}
      >
        <div className={cn("polygons-banner-dim", "absolute inset-0 bg-cs-bg/72")} />
        <Card
          className={cn(
            "polygons-banner-card",
            "relative z-[1] flex min-w-36 flex-col items-center gap-1 rounded-[0.75rem] px-6 py-4 text-center",
            cardAnim,
            "border-transparent bg-cs-accent text-cs-bg"
          )}
          shadow="md"
          withBorder={false}
        >
          <Text className={cn("polygons-banner-label", "opacity-80")} size="sm">
            {label}
          </Text>
          {hero &&
            <Text className={cn("polygons-banner-number", "font-headings leading-none font-extrabold", heroClass)}>
              {hero}
            </Text>
          }
        </Card>
      </div>,
    document.body
  )
})

export default PolygonsBanner
