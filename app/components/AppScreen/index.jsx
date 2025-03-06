import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"

const AppScreen = ({ name, children }) => {
  return (
    <>
      <AppHeader name={name} />
      <div className="AppScreen_root">
        {children}
      </div>
    </>
  )
}

export default AppScreen
