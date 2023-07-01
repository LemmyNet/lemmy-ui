import setDefaultOptions from "date-fns/setDefaultOptions";
import { I18NextService } from "../../services";

export default async function () {
  let lang = I18NextService.i18n.language;
  if (lang === "en") {
    lang = "en-US";
  }

  // if lang and country are the same, then date-fns expects only the lang
  // eg: instead of "fr-FR", we should import just "fr"

  if (lang.includes("-")) {
    const parts = lang.split("-");
    if (parts[0] === parts[1].toLowerCase()) {
      lang = parts[0];
    }
  }

  const locale = (
    await import(
      /* webpackExclude: /\.js\.flow$/ */
      `date-fns/locale/${lang}`
    )
  ).default;
  setDefaultOptions({
    locale,
  });
}
