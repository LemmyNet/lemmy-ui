import { setDefaultOptions, Locale } from "date-fns";
import { I18NextService } from "../../services";
import { enUS } from "date-fns/locale/en-US";
import { ImportReport } from "../../dynamic-imports";

type DateFnsDesc = { resource: string; code: string };

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
  { resource: "en-IN", code: "en-IN" },
  { resource: "en-NZ", code: "en-NZ" },
  { resource: "en-US", code: "en-US" },
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
  { resource: "zh-CN", code: "zh-CN" },
  { resource: "zh-HK", code: "zh-HK" },
  { resource: "zh-TW", code: "zh-TW" },
];

const localeByCode = locales.reduce((acc, l) => {
  acc[l.code] = l;
  return acc;
}, {});

// Use pt-BR for users with removed interface language pt_BR.
localeByCode["pt_BR"] = localeByCode["pt-BR"];

const EN_US = "en-US";

function langToLocale(lang: string): DateFnsDesc | undefined {
  if (lang === "en") {
    lang = EN_US;
  }

  // if lang and country are the same, then date-fns expects only the lang
  // eg: instead of "fr-FR", we should import just "fr"

  if (lang.includes("-")) {
    const parts = lang.split("-");
    if (parts[0] === parts[1].toLowerCase()) {
      lang = parts[0];
    }
  }

  return localeByCode[lang];
}

async function load(locale: DateFnsDesc): Promise<Locale> {
  return import(
    /* webpackChunkName: `date-fns-[request]` */
    `date-fns/locale/${locale.resource}.mjs`
  ).then(x => x.default);
}

export async function verifyDateFnsImports(): Promise<ImportReport> {
  const report = new ImportReport();
  const promises = locales.map(locale =>
    load(locale)
      .then(x => {
        if (x && x.code === locale.code) {
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

export default async function () {
  const i18n_full_lang = I18NextService.i18n.resolvedLanguage ?? EN_US;
  const localeDesc = langToLocale(i18n_full_lang) ?? localeByCode[EN_US];
  try {
    const locale = await load(localeDesc);
    if (locale) {
      setDefaultOptions({ locale });
      return;
    }
  } catch {
    console.error(`Loading ${localeDesc.code} date-fns failed.`);
  }

  setDefaultOptions({ locale: enUS });
}
