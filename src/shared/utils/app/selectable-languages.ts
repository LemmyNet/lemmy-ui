import { Language } from "lemmy-js-client";
import { UserService } from "../../services";

/**
 * This shows what language you can select
 *
 * Use showAll for the site form
 * Use showSite for the profile and community forms
 * Use false for both those to filter on your profile and site ones
 */
export default function selectableLanguages(
  allLanguages: Language[],
  siteLanguages: number[],
  showAll?: boolean,
  showSite?: boolean,
  myUserInfo = UserService.Instance.myUserInfo,
): Language[] {
  const allLangIds = allLanguages.map(l => l.id);
  let myLangs = myUserInfo?.discussion_languages ?? allLangIds;
  myLangs = myLangs.length == 0 ? allLangIds : myLangs;
  const siteLangs = siteLanguages.length == 0 ? allLangIds : siteLanguages;

  if (showAll) {
    return allLanguages;
  } else {
    if (showSite) {
      return allLanguages.filter(x => siteLangs.includes(x.id));
    } else {
      return allLanguages
        .filter(x => siteLangs.includes(x.id))
        .filter(x => myLangs.includes(x.id));
    }
  }
}
