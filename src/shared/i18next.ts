import { isBrowser } from "@utils/browser";
import i18next, { i18nTyped, Resource } from "i18next";
import { UserService } from "./services";
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
import { oc } from "./translations/oc";
import { pl } from "./translations/pl";
import { pt } from "./translations/pt";
import { pt_BR } from "./translations/pt_BR";
import { ru } from "./translations/ru";
import { sv } from "./translations/sv";
import { vi } from "./translations/vi";
import { zh } from "./translations/zh";
import { zh_Hant } from "./translations/zh_Hant";

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
  { resource: oc, code: "oc", name: "Occitan" },
  { resource: pl, code: "pl", name: "Polski" },
  { resource: pt, code: "pt", name: "Português" },
  { resource: pt_BR, code: "pt_BR", name: "Português (Brasil)" },
  { resource: ru, code: "ru", name: "Русский" },
  { resource: sv, code: "sv", name: "Svenska" },
  { resource: vi, code: "vi", name: "Tiếng Việt" },
  { resource: zh, code: "zh", name: "中文 (简体)" },
  { resource: zh_Hant, code: "zh-TW", name: "中文 (繁體)" },
];

const resources: Resource = {};
languages.forEach(l => (resources[l.code] = l.resource));

function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

class LanguageDetector {
  static readonly type = "languageDetector";

  detect() {
    const langs: string[] = [];

    const myLang =
      UserService.Instance.myUserInfo?.local_user_view.local_user
        .interface_language ?? "browser";

    if (myLang !== "browser") langs.push(myLang);

    if (isBrowser()) langs.push(...navigator.languages);

    return langs;
  }
}

i18next.use(LanguageDetector).init({
  debug: false,
  compatibilityJSON: "v3",
  supportedLngs: languages.map(l => l.code),
  nonExplicitSupportedLngs: true,
  // load: 'languageOnly',
  // initImmediate: false,
  fallbackLng: "en",
  resources,
  interpolation: { format },
});

export const i18n = i18next as i18nTyped;
