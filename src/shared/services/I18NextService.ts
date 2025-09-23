import i18next, { i18n, InitOptions, Resource } from "i18next";
import { ImportReport } from "@utils/dynamic-imports";
import { en } from "../translations/en";
import { Locale, setDefaultOptions } from "date-fns";
import { isBrowser } from "@utils/browser";
import { toast } from "@utils/app";
import { allLanguages, TranslationDesc } from "../build-config";

/****************
 * Translations *
 ****************/

type FoundTranslation = [TranslationDesc] | [TranslationDesc, TranslationDesc];

const languageByCode = allLanguages.reduce((acc, l) => {
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
  const promises = allLanguages.map(lang =>
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

const localeByCode = allLanguages.reduce((acc, l) => {
  acc[l.code] = l;
  return acc;
}, {});

async function loadLocale(locale: TranslationDesc): Promise<Locale> {
  return import(
    /* webpackChunkName: `date-fns-[request]` */
    `date-fns/locale/${locale.datefns_resource ?? locale.resource}.js`
  ).then(x => x.default);
}

export function pickLocale(lang: string): TranslationDesc | undefined {
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
    return allLanguages.find(l => {
      return l.code.startsWith(parts[0]);
    });
  }
  return locale;
}

export async function verifyDateFnsImports(): Promise<ImportReport> {
  const report = new ImportReport();
  const promises = allLanguages.map(locale =>
    loadLocale(locale)
      .then(x => {
        if (x && x.code === (locale.datefns_resource ?? locale.resource)) {
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
): [TranslationDesc, FoundTranslation] {
  const langList =
    interfaceLanguage === "browser"
      ? [...languages]
      : [interfaceLanguage, ...languages];
  for (const lang of langList) {
    const pickedTranslations = pickTranslations(lang);
    if (pickedTranslations) {
      const pickedLocale = pickLocale(lang);
      return [pickedLocale ?? localeByCode["en"], pickedTranslations];
    }
  }
  return [localeByCode["en"], [languageByCode["en"]]];
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
