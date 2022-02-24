import i18next, { i18nTyped, Resource } from "i18next";
import { ar } from "./translations/ar";
import { bg } from "./translations/bg";
import { ca } from "./translations/ca";
import { cs } from "./translations/cs";
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
import { hr } from "./translations/hr";
import { id } from "./translations/id";
import { it } from "./translations/it";
import { ja } from "./translations/ja";
import { ko } from "./translations/ko";
import { nl } from "./translations/nl";
import { pl } from "./translations/pl";
import { pt } from "./translations/pt";
import { pt_BR } from "./translations/pt_BR";
import { ru } from "./translations/ru";
import { sv } from "./translations/sv";
import { vi } from "./translations/vi";
import { zh } from "./translations/zh";
import { zh_Hant } from "./translations/zh_Hant";
import { getLanguages } from "./utils";

export const languages = [
  { resource: ar, code: "ar", name: "العربية" },
  { resource: bg, code: "bg", name: "Български" },
  { resource: ca, code: "ca", name: "Català" },
  { resource: cs, code: "cs", name: "Česky" },
  { resource: da, code: "da", name: "Dansk" },
  { resource: de, code: "de", name: "Deutsch" },
  { resource: el, code: "el", name: "Ελληνικά" },
  { resource: en, code: "en", name: "English" },
  { resource: eo, code: "eo", name: "Esperanto" },
  { resource: es, code: "es", name: "Español" },
  { resource: eu, code: "eu", name: "Euskara" },
  { resource: fa, code: "fa", name: "فارسی" },
  { resource: fi, code: "fi", name: "Suomi" },
  { resource: fr, code: "fr", name: "Français" },
  { resource: ga, code: "ga", name: "Gaeilge" },
  { resource: gl, code: "gl", name: "Galego" },
  { resource: hr, code: "hr", name: "Hrvatski" },
  { resource: id, code: "id", name: "Bahasa Indonesia" },
  { resource: it, code: "it", name: "Italiano" },
  { resource: ja, code: "ja", name: "日本語" },
  { resource: ko, code: "ko", name: "한국어" },
  { resource: nl, code: "nl", name: "Nederlands" },
  { resource: pl, code: "pl", name: "Polski" },
  { resource: pt, code: "pt", name: "Português" },
  { resource: pt_BR, code: "pt_BR", name: "Português (Brasil)" },
  { resource: ru, code: "ru", name: "Русский" },
  { resource: sv, code: "sv", name: "Svenska" },
  { resource: vi, code: "vi", name: "Tiếng Việt" },
  { resource: zh, code: "zh", name: "中文" },
  { resource: zh_Hant, code: "zh_Hant", name: "文言" },
];

const resources: Resource = {};
languages.forEach(l => (resources[l.code] = l.resource));

function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

i18next.init({
  debug: false,
  compatibilityJSON: "v3",
  // load: 'languageOnly',
  // initImmediate: false,
  lng: getLanguages()[0],
  fallbackLng: "en",
  resources,
  interpolation: { format },
});

export const i18n = i18next as i18nTyped;
