import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"
import { AppFabs } from "../AppFabs"

const AppScreen = ({ name, children, onBack, header = true, fabs, raisedFabs }) => {
  return (
    <>
      {header &&
        <AppHeader
          name={name}
          onBack={onBack}
        />
      }
      <div className="AppScreen_root">
        {children}
      </div>
      {fabs &&
        <AppFabs raised={raisedFabs}>
          {fabs}
        </AppFabs>
      }
    </>
  )
}

export default AppScreen
