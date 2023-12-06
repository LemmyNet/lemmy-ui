import { GetSiteResponse } from "lemmy-js-client";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { I18NextService, UserService } from "../../services";
import { updateDataBsTheme } from "@utils/browser";

export default function initializeSite(site?: GetSiteResponse) {
  // TODO Should already be in siteRes
  UserService.Instance.myUserInfo = site?.my_user;
  updateDataBsTheme(site);
  I18NextService.i18n.changeLanguage();
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
