import { isBrowser } from "@utils/browser";
import i18next, { BackendModule, ReadCallback, Resource } from "i18next";
import { ImportReport } from "../dynamic-imports";
import { UserService } from "../services";
import { en } from "../translations/en";
import { setupDateFns } from "@utils/app";

export type TranslationDesc = {
  resource: string;
  code: string;
  name: string;
  bundled?: boolean;
};

export const languages: TranslationDesc[] = [
  { resource: "ar", code: "ar", name: "العربية" },
  { resource: "bg", code: "bg", name: "Български" },
  { resource: "ca", code: "ca", name: "Català" },
  { resource: "cs", code: "cs", name: "Česky" },
  { resource: "da", code: "da", name: "Dansk" },
  { resource: "de", code: "de", name: "Deutsch" },
  { resource: "el", code: "el", name: "Ελληνικά" },
  { resource: "en", code: "en", name: "English", bundled: true },
  { resource: "eo", code: "eo", name: "Esperanto" },
  { resource: "es", code: "es", name: "Español" },
  { resource: "eu", code: "eu", name: "Euskara" },
  { resource: "fa", code: "fa", name: "فارسی" },
  { resource: "fi", code: "fi", name: "Suomi" },
  { resource: "fr", code: "fr", name: "Français" },
  { resource: "ga", code: "ga", name: "Gaeilge" },
  { resource: "gl", code: "gl", name: "Galego" },
  { resource: "hr", code: "hr", name: "Hrvatski" },
  { resource: "id", code: "id", name: "Bahasa Indonesia" },
  { resource: "it", code: "it", name: "Italiano" },
  { resource: "ja", code: "ja", name: "日本語" },
  { resource: "ko", code: "ko", name: "한국어" },
  { resource: "nl", code: "nl", name: "Nederlands" },
  { resource: "oc", code: "oc", name: "Occitan" },
  { resource: "pl", code: "pl", name: "Polski" },
  { resource: "pt", code: "pt", name: "Português" },
  { resource: "pt_BR", code: "pt-BR", name: "Português (Brasil)" },
  { resource: "ru", code: "ru", name: "Русский" },
  { resource: "sv", code: "sv", name: "Svenska" },
  { resource: "vi", code: "vi", name: "Tiếng Việt" },
  { resource: "zh", code: "zh", name: "中文 (简体)" },
  { resource: "zh_Hant", code: "zh-TW", name: "中文 (繁體)" },
];

const languageByCode = languages.reduce((acc, l) => {
  acc[l.code] = l;
  return acc;
}, {});

// Use pt-BR for users with removed interface language pt_BR.
languageByCode["pt_BR"] = languageByCode["pt-BR"];

async function load(translation: TranslationDesc): Promise<Resource> {
  const { resource } = translation;
  return import(
    /* webpackChunkName: `translation-[request]`  */
    `../translations/${resource}`
  ).then(x => x[resource]);
}

export async function verifyTranslationImports(): Promise<ImportReport> {
  const report = new ImportReport();
  const promises = languages.map(lang =>
    load(lang)
      .then(x => {
        if (x && x["translation"]) {
          report.success.push(lang.code);
        } else {
          throw "unexpected format";
        }
      })
      .catch(err => report.error.push({ id: lang.code, error: err })),
  );
  await Promise.all(promises);
  return report;
}

export function pickTranslations(lang: string): TranslationDesc[] | undefined {
  const primary = languageByCode[lang];
  const [head] = (primary?.code ?? lang).split("-");
  const secondary = head !== lang ? languageByCode[head] : undefined;
  if (primary && secondary) {
    return [primary, secondary];
  } else if (primary) {
    return [primary];
  } else if (secondary) {
    return [secondary];
  }
  return undefined;
}

export function findTranslationChunkNames(
  languages: readonly string[],
): string[] {
  for (const lang of languages) {
    const translations = pickTranslations(lang);
    if (!translations) {
      continue;
    }
    return translations
      .filter(x => !x.bundled)
      .map(x => `translation-${x.resource}`);
  }
  return [];
}

export async function loadUserLanguage() {
  await new Promise(r => I18NextService.i18n.changeLanguage(undefined, r));
  await setupDateFns();
}

function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

class LanguageDetector {
  static readonly type = "languageDetector";

  detect() {
    return LanguageService.userLanguages;
  }
}

export class LanguageService {
  private static _serverLanguages: readonly string[] = [];
  private static get languages(): readonly string[] {
    if (isBrowser()) {
      return navigator.languages;
    } else {
      return this._serverLanguages;
    }
  }
  static updateLanguages(languages: readonly string[]) {
    this._serverLanguages = languages;
    I18NextService.i18n.changeLanguage();
    setupDateFns();
  }
  static get userLanguages(): readonly string[] {
    const myLang =
      UserService.Instance.myUserInfo?.local_user_view.local_user
        .interface_language ?? "browser";
    if (myLang === "browser") {
      return this.languages;
    }
    return [myLang, ...this.languages];
  }
}

class LazyLoader implements Omit<BackendModule, "type"> {
  static readonly type = "backend";

  init() {}

  read(language: string, namespace: string, cb: ReadCallback): void {
    const translation: TranslationDesc = languageByCode[language];
    if (!translation) {
      cb(new Error(`No translation found: ${language} ${namespace}`), false);
      return;
    }
    load(translation)
      .then(data => {
        const resKeys = data && data[namespace];
        if (!resKeys) throw Error(`Failed loading: ${language} ${namespace}`);
        cb(null, resKeys);
      })
      .catch(err => cb(err, false));
  }
}

export class I18NextService {
  #i18n: typeof i18next;
  static #instance: I18NextService;

  private constructor() {
    this.#i18n = i18next;
    this.#i18n
      .use(LanguageDetector)
      .use(LazyLoader)
      .init({
        debug: false,
        compatibilityJSON: "v3",
        supportedLngs: languages.map(l => l.code),
        nonExplicitSupportedLngs: true,
        load: "all",
        // initImmediate: false,
        fallbackLng: "en",
        resources: { en } as Resource,
        interpolation: { format },
        partialBundledLanguages: true,
      });
  }

  static get #Instance() {
    return this.#instance ?? (this.#instance = new this());
  }

  public static get i18n() {
    return this.#Instance.#i18n;
  }
}
