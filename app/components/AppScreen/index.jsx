import React from "react"
import "./index.scss"
import AppHeader from "../AppHeader"
import { AppFabs } from "../AppFabs"

const AppScreen = ({ name, children, onBack, header = true, fabs, action }) => {
  return (
    <>
      {header &&
        <AppHeader
          name={name}
          onBack={onBack}
          action={action}
        />
      }
      <div className="AppScreen_root">
        {children}
      </div>
      {fabs &&
        <AppFabs>
          {fabs}
        </AppFabs>
      }
    </>
  )
}

export default AppScreen
