import i18n from "i18next"
import translationEN from "./en.json"
import { initReactI18next } from "react-i18next"
import _ from "lodash"
import { actions } from "../store"

const DEFAULT_LANGUAGE = "en"
const languageActions = actions.create("language")


export const loadLanguage = () => {
  const language = languageActions.get(undefined, DEFAULT_LANGUAGE)
  languageActions.set(language)

  i18n
    .use(initReactI18next)
    .init({
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
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
