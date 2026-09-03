import React from "react"
import { cn } from "app/core"


const AppScreen = ({ children }) => {
  return (
    <div className={cn("app-screen", "relative flex min-h-0 flex-1 flex-col overflow-hidden")}>
      {children}
    </div>
  )
}

export default AppScreen
