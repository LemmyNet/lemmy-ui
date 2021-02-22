import { GetSiteResponse } from "lemmy-js-client";
import { UserService } from "./services";
import { i18n } from "./i18next";
import { getLanguage } from "./utils";

export function initializeSite(site: GetSiteResponse) {
  UserService.Instance.user = site.my_user;
  i18n.changeLanguage(getLanguage());
}
