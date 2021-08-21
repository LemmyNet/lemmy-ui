import i18next, { i18nTyped } from "i18next";
import { ar } from "./translations/ar";
import { bg } from "./translations/bg";
import { ca } from "./translations/ca";
import { cy } from "./translations/cy";
import { da } from "./translations/da";
import { de } from "./translations/de";
import { el } from "./translations/el";
import { en } from "./translations/en";
import { eo } from "./translations/eo";
import { es } from "./translations/es";
import { eu } from "./translations/eu";
import { fa } from "./translations/fa";
import { fi } from "./translations/fi";
import { fr } from "./translations/fr";
import { ga } from "./translations/ga";
import { gl } from "./translations/gl";
import { hi } from "./translations/hi";
import { hr } from "./translations/hr";
import { hu } from "./translations/hu";
import { id } from "./translations/id";
import { it } from "./translations/it";
import { ja } from "./translations/ja";
import { ka } from "./translations/ka";
import { km } from "./translations/km";
import { ko } from "./translations/ko";
import { mnc } from "./translations/mnc";
import { nb_NO } from "./translations/nb_NO";
import { nl } from "./translations/nl";
import { oc } from "./translations/oc";
import { pl } from "./translations/pl";
import { pt_BR } from "./translations/pt_BR";
import { ru } from "./translations/ru";
import { sk } from "./translations/sk";
import { sq } from "./translations/sq";
import { sr_Latn } from "./translations/sr_Latn";
import { sv } from "./translations/sv";
import { th } from "./translations/th";
import { tr } from "./translations/tr";
import { uk } from "./translations/uk";
import { vi } from "./translations/vi";
import { zh } from "./translations/zh";
import { zh_Hant } from "./translations/zh_Hant";
import { getLanguage } from "./utils";

// https://github.com/nimbusec-oss/inferno-i18next/blob/master/tests/T.test.js#L66
const resources = {
  en,
  el,
  eu,
  eo,
  es,
  ka,
  hi,
  de,
  zh,
  fr,
  sv,
  ru,
  nl,
  it,
  fi,
  ca,
  fa,
  pl,
  pt_BR,
  ja,
  gl,
  tr,
  hu,
  uk,
  sq,
  km,
  ga,
  sr_Latn,
  da,
  oc,
  hr,
  th,
  bg,
  ar,
  ko,
  id,
  nb_NO,
  zh_Hant,
  cy,
  mnc,
  sk,
  vi,
};

function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

i18next.init({
  debug: false,
  // load: 'languageOnly',

  // initImmediate: false,
  lng: getLanguage(),
  fallbackLng: "en",
  resources,
  interpolation: { format },
});

export const i18n = i18next as i18nTyped;

export { resources };
