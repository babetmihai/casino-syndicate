import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"

const AppLayout = ({ children }) => {
  return (
    <div className="AppLayout_root">
      <AppHeader />
      <div className="AppLayout_content">
        {children}
      </div>
    </div>
  )
}

export default AppLayout