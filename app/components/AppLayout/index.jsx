import React from "react"
import "./index.scss"

const AppLayout = ({ children }) => {
  return (
    <div className="AppLayout_root">
      {children}
    </div>
  )
}

export default AppLayout