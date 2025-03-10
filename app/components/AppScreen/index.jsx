import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"

const AppScreen = ({ name, children, onBack }) => {
  return (
    <>
      <AppHeader name={name} onBack={onBack} />
      <div className="AppScreen_root">
        {children}
      </div>
    </>
  )
}

export default AppScreen
