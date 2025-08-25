import i18next, { i18n, InitOptions, Resource } from "i18next";
import { ImportReport } from "@utils/dynamic-imports";
import { en } from "../translations/en";
import { Locale, setDefaultOptions } from "date-fns";
import { isBrowser } from "@utils/browser";
import { toast } from "@utils/app";

/****************
 * Translations *
 ****************/

export type TranslationDesc = {
  resource: string;
  code: string;
  name: string;
  bundled?: boolean;
};

type FoundTranslation = [TranslationDesc] | [TranslationDesc, TranslationDesc];

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
  { resource: "hu", code: "hu", name: "magyar nyelv" },
  { resource: "id", code: "id", name: "Bahasa Indonesia" },
  { resource: "it", code: "it", name: "Italiano" },
  { resource: "ja", code: "ja", name: "日本語" },
  { resource: "ko", code: "ko", name: "한국어" },
  { resource: "nl", code: "nl", name: "Nederlands" },
  { resource: "nn", code: "nn", name: "nynorsk" },
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

async function loadTranslation(
  translation: TranslationDesc,
): Promise<Resource> {
  const { resource } = translation;
  return import(
    /* webpackChunkName: `translation-[request]`  */
    `../translations/${resource}`
  ).then(x => x[resource]);
}

export async function verifyTranslationImports(): Promise<ImportReport> {
  const report = new ImportReport();
  const promises = languages.map(lang =>
    loadTranslation(lang)
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

// Can return two translations. E.g. missing keys in "pt-BR" look up keys in "pt" before "en"
export function pickTranslations(lang: string): FoundTranslation | undefined {
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

/************
 * date-fns *
 ************/

export type DateFnsDesc = { resource: string; code: string; bundled?: boolean };

const locales: DateFnsDesc[] = [
  { resource: "af", code: "af" },
  { resource: "ar", code: "ar" },
  { resource: "ar-DZ", code: "ar-DZ" },
  { resource: "ar-EG", code: "ar-EG" },
  { resource: "ar-MA", code: "ar-MA" },
  { resource: "ar-SA", code: "ar-SA" },
  { resource: "ar-TN", code: "ar-TN" },
  { resource: "az", code: "az" },
  { resource: "be", code: "be" },
  { resource: "be-tarask", code: "be-tarask" },
  { resource: "bg", code: "bg" },
  { resource: "bn", code: "bn" },
  { resource: "bs", code: "bs" },
  { resource: "ca", code: "ca" },
  { resource: "cs", code: "cs" },
  { resource: "cy", code: "cy" },
  { resource: "da", code: "da" },
  { resource: "de", code: "de" },
  { resource: "de-AT", code: "de-AT" },
  { resource: "el", code: "el" },
  { resource: "en-AU", code: "en-AU" },
  { resource: "en-CA", code: "en-CA" },
  { resource: "en-GB", code: "en-GB" },
  { resource: "en-IE", code: "en-IE" },
  { resource: "en-IE", code: "ga" }, // "ga" (Irish Gaelic) is available as user pref, but has currently no date-fns support
  { resource: "en-IN", code: "en-IN" },
  { resource: "en-NZ", code: "en-NZ" },
  { resource: "en-US", code: "en-US", bundled: true },
  { resource: "en-ZA", code: "en-ZA" },
  { resource: "eo", code: "eo" },
  { resource: "es", code: "es" },
  { resource: "et", code: "et" },
  { resource: "eu", code: "eu" },
  { resource: "fa-IR", code: "fa-IR" },
  { resource: "fi", code: "fi" },
  { resource: "fr", code: "fr" },
  { resource: "fr-CA", code: "fr-CA" },
  { resource: "fr-CH", code: "fr-CH" },
  { resource: "fy", code: "fy" },
  { resource: "gd", code: "gd" },
  { resource: "gl", code: "gl" },
  { resource: "gu", code: "gu" },
  { resource: "he", code: "he" },
  { resource: "hi", code: "hi" },
  { resource: "hr", code: "hr" },
  { resource: "ht", code: "ht" },
  { resource: "hu", code: "hu" },
  { resource: "hy", code: "hy" },
  { resource: "id", code: "id" },
  { resource: "is", code: "is" },
  { resource: "it", code: "it" },
  { resource: "it-CH", code: "it-CH" },
  { resource: "ja", code: "ja" },
  { resource: "ja-Hira", code: "ja-Hira" },
  { resource: "ka", code: "ka" },
  { resource: "kk", code: "kk" },
  { resource: "km", code: "km" },
  { resource: "kn", code: "kn" },
  { resource: "ko", code: "ko" },
  { resource: "lb", code: "lb" },
  { resource: "lt", code: "lt" },
  { resource: "lv", code: "lv" },
  { resource: "mk", code: "mk" },
  { resource: "mn", code: "mn" },
  { resource: "ms", code: "ms" },
  { resource: "mt", code: "mt" },
  { resource: "nb", code: "nb" },
  { resource: "nl", code: "nl" },
  { resource: "nl-BE", code: "nl-BE" },
  { resource: "nn", code: "nn" },
  { resource: "oc", code: "oc" },
  { resource: "pl", code: "pl" },
  { resource: "pt", code: "pt" },
  { resource: "pt-BR", code: "pt-BR" },
  { resource: "ro", code: "ro" },
  { resource: "ru", code: "ru" },
  { resource: "sk", code: "sk" },
  { resource: "sl", code: "sl" },
  { resource: "sq", code: "sq" },
  { resource: "sr", code: "sr" },
  { resource: "sr-Latn", code: "sr-Latn" },
  { resource: "sv", code: "sv" },
  { resource: "ta", code: "ta" },
  { resource: "te", code: "te" },
  { resource: "th", code: "th" },
  { resource: "tr", code: "tr" },
  { resource: "ug", code: "ug" },
  { resource: "uk", code: "uk" },
  { resource: "uz", code: "uz" },
  { resource: "uz-Cyrl", code: "uz-Cyrl" },
  { resource: "vi", code: "vi" },
  { resource: "zh-CN", code: "zh" },
  { resource: "zh-CN", code: "zh-CN" },
  { resource: "zh-HK", code: "zh-HK" },
  { resource: "zh-TW", code: "zh-TW" },
];

const localeByCode = locales.reduce((acc, l) => {
  acc[l.code] = l;
  return acc;
}, {});

async function loadLocale(locale: DateFnsDesc): Promise<Locale> {
  return import(
    /* webpackChunkName: `date-fns-[request]` */
    `date-fns/locale/${locale.resource}.js`
  ).then(x => x.default);
}

export function pickLocale(lang: string): DateFnsDesc | undefined {
  if (lang === "en") {
    lang = "en-US";
  }

  // if lang and country are the same, then date-fns expects only the lang
  // eg: instead of "fr-FR", we should import just "fr"

  const parts = lang.split("-");
  if (parts.length > 1) {
    if (parts[0] === parts[1].toLowerCase()) {
      lang = parts[0];
    }
  }

  let locale = localeByCode[lang];
  if (!locale && parts.length > 1) {
    // Look for language-only variant e.g. "de" for "de-CH"
    locale = localeByCode[parts[0]];
  }
  if (!locale && parts.length > 0) {
    // Look for any variant of the same language
    return locales.find(l => {
      return l.code.startsWith(parts[0]);
    });
  }
  return locale;
}

export async function verifyDateFnsImports(): Promise<ImportReport> {
  const report = new ImportReport();
  const promises = locales.map(locale =>
    loadLocale(locale)
      .then(x => {
        if (x && x.code === locale.resource) {
          report.success.push(locale.code);
        } else {
          throw "unexpected format";
        }
      })
      .catch(err => report.error.push({ id: locale.code, error: err })),
  );
  await Promise.all(promises);
  return report;
}

/*****************************
 * Translations and date-fns *
 *****************************/

// This finds a translation first and also returns the corresponding date-fns
// locale. This prevents picking a language for date-fns that is not available
// as translation.
export function findLanguageDescs(
  languages: readonly string[], // readonly because navigator.languages is too
  interfaceLanguage: string = "browser",
): [DateFnsDesc, FoundTranslation] {
  const langList =
    interfaceLanguage === "browser"
      ? [...languages]
      : [interfaceLanguage, ...languages];
  for (const lang of langList) {
    const pickedTranslations = pickTranslations(lang);
    if (pickedTranslations) {
      const pickedLocale = pickLocale(lang);
      return [pickedLocale ?? localeByCode["en-US"], pickedTranslations];
    }
  }
  return [localeByCode["en-US"], [languageByCode["en"]]];
}

export function findLanguageChunkNames(
  languages: readonly string[],
  interfaceLanguage: string = "browser",
): string[] {
  const [locale, translations] = findLanguageDescs(
    languages,
    interfaceLanguage,
  );
  const localeNames = locale.bundled ? [] : [`date-fns-${locale.resource}-js`];
  return [
    ...localeNames,
    ...translations
      .filter(x => !x.bundled)
      .map(x => `translation-${x.resource}`),
  ];
}

export async function loadLanguageInstances(
  languages: readonly string[],
  interfaceLanguage: string = "browser",
): Promise<[Locale, i18n]> {
  const [localeDesc, translationDescs] = findLanguageDescs(
    languages,
    interfaceLanguage,
  );
  const localePromise = loadLocale(localeDesc);

  const options: InitOptions = {
    debug: false,
    compatibilityJSON: "v3",
    returnEmptyString: false,
    nonExplicitSupportedLngs: true,
    load: "all",
    initImmediate: false,
    fallbackLng: "en",
    resources: { en },
    interpolation: { format },
    saveMissing: process.env["NODE_ENV"] === "development",
    saveMissingPlurals: process.env["NODE_ENV"] === "development", // only works with v4 plurals
    saveMissingTo: "all",
  };
  const i18n = i18next.createInstance(options);
  i18n.init();
  i18n.on("missingKey", missingKeyHandler); // called on first use of missing key

  await Promise.all(
    translationDescs
      .filter(t => !t.bundled && !i18n.hasResourceBundle(t.code, "translation"))
      .map(async t => {
        const data = await loadTranslation(t);
        i18n.addResourceBundle(t.code, "translation", data["translation"]);
      }),
  );
  await new Promise(r => i18n.changeLanguage(translationDescs[0].code, r));

  return [await localePromise, i18n];
}

// Updates both the given i18n instance and the global date-fns options
export async function updateLanguageInstances(
  i18n: i18n,
  languages: readonly string[],
  interfaceLanguage: string = "browser",
): Promise<void> {
  const [localeDesc, translationDescs] = findLanguageDescs(
    languages,
    interfaceLanguage,
  );
  const locale = loadLocale(localeDesc);

  await Promise.all(
    translationDescs
      .filter(t => !t.bundled && !i18n.hasResourceBundle(t.code, "translation"))
      .map(async t => {
        const data = await loadTranslation(t);
        i18n.addResourceBundle(t.code, "translation", data["translation"]);
      }),
  );
  await new Promise(r => i18n.changeLanguage(translationDescs[0].code, r));
  setDefaultOptions({ locale: await locale });
}

/***********
 * i18next *
 ***********/

export function format(value: any, format: any): any {
  return format === "uppercase" ? value.toUpperCase() : value;
}

function missingKeyHandler(
  _: readonly string[],
  __: string,
  key: string,
): void {
  const msg = `Missing i18n key: ${key}`;
  toast(`${msg}`, "info");
  let stack = new Error().stack?.split("\n") ?? [];
  stack = stack.filter(x => !x.includes("node_modules")).slice(0, 3);
  console.warn(msg + ` \n${stack.join("\n")}`);
}

export class I18NextService {
  #i18n: typeof i18next;
  #forceUpdate?: () => void;
  static #instance: I18NextService;

  private constructor() {}

  static get #Instance() {
    return this.#instance ?? (this.#instance = new this());
  }

  public static get i18n() {
    return this.#Instance.#i18n;
  }

  public static set i18n(i18n: typeof i18next) {
    if (isBrowser() && this.#Instance.#i18n && this.#Instance.#i18n !== i18n) {
      // In SSR this is ok, because it only ever renders once.
      throw "<Provider /> doesn't support switching between i18next instances";
    }
    this.#Instance.#i18n = i18n;
  }

  public static set forceUpdate(rerender: () => void) {
    this.#Instance.#forceUpdate = rerender;
  }

  public static async reconfigure(
    languages: readonly string[],
    interfaceLanguage: string = "browser",
  ) {
    await updateLanguageInstances(
      this.#instance.#i18n,
      languages,
      interfaceLanguage,
    );
    this.#Instance.#forceUpdate?.();
  }
}
