import setDefaultOptions from "date-fns/setDefaultOptions";
import { I18NextService } from "../../services";

export default async function () {
  let lang = I18NextService.i18n.language;
  if (lang === "en" || lang === "en-AU") {
    lang = "en-US";
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
