import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"

const AppScreen = ({ name, children, onBack, actions }) => {
  return (
    <>
      <AppHeader
        name={name}
        onBack={onBack}
        actions={actions}
      />
      <div className="AppScreen_root">
        {children}
      </div>
    </>
  )
}

export default AppScreen
