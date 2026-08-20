import React from "react"
import AppHeader from "../AppHeader"

const AppScreen = ({ children, header = true }) => {
  return (
    <>
      {header &&
        <AppHeader />
      }
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </>
  )
}

export default AppScreen
