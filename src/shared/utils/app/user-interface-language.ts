import { Language, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services/I18NextService";

export default function getUserInterfaceLanguageId({
  myUserInfo,
  allLanguages,
}: {
  myUserInfo: MyUserInfo;
  allLanguages: Language[];
}): number {
  // Get the string of the browser- or user-defined language, like en-US
  const i18nLang = I18NextService.i18n.language;

  // Find the Language object with a code that matches the initial characters of
  // this string
  const userLang = allLanguages.find(lang => {
    return i18nLang.indexOf(lang.code) === 0;
  });

  // Return the ID of that language object, or "0" for Undetermined
  return userLang.id || 0;
}
