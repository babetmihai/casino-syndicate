import React from "react"
import { cn } from "app/core"

const AppLayout = ({ children }) => {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-cs-bg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className={cn(
            "absolute inset-0 bg-size-[3rem_3rem]",
            "bg-[linear-gradient(rgb(45_212_191/0.03)_1px,transparent_1px),linear-gradient(90deg,rgb(45_212_191/0.03)_1px,transparent_1px)]",
            "mask-[radial-gradient(ellipse_80%_60%_at_50%_0%,black_20%,transparent_70%)]"
          )}
        />
        <div
          className={cn(
            "absolute -top-[15rem] -right-[10rem] size-[40rem] rounded-full blur-[8rem]",
            "bg-[radial-gradient(circle,rgb(45_212_191/0.07),transparent_70%)]"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-[20rem] -left-[15rem] size-[40rem] rounded-full blur-[8rem]",
            "bg-[radial-gradient(circle,rgb(129_140_248/0.08),transparent_70%)]"
          )}
        />
      </div>
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default AppLayout
