import { GetSiteResponse } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { UserService } from "../../services";

export default function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  i18n.changeLanguage();
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
