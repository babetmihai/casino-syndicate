import React from "react"
import AppScreen from "app/components/AppScreen"
import { useTranslation } from "react-i18next"
import "./index.scss"

const MainScreen = () => {
  const { t } = useTranslation()

  return (
    <AppScreen name={t("main")}>
      <div className="MainScreen_content">
        <div className="MainScreen_header">

        </div>
      </div>
    </AppScreen>
  )
}

export default MainScreen
