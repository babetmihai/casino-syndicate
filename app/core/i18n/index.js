import i18n from "i18next"
import translationEN from "./en.json"
import { initReactI18next } from "react-i18next"
import _ from "lodash"
import { actions } from "../store"
import dayjs from "dayjs"


const DEFAULT_LANGUGAGE = "en"


export const loadLanguage = () => {
  const language = actions.get("language", DEFAULT_LANGUGAGE)
  actions.set("language", language)

  dayjs.locale(language)
  i18n
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: DEFAULT_LANGUGAGE,
      returnEmptyString: false,
      resources: {
        en: {
          translation: translationEN
        }
      },
      parseMissingKeyHandler: (value) => _.upperFirst(value.split("_").join(" "))
    })
}


export default i18n