import { GetSiteResponse } from "lemmy-js-client";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { I18NextService, UserService } from "../../services";

export default function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  I18NextService.i18n.changeLanguage();
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
