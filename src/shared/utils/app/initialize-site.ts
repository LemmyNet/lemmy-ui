import { GetSiteResponse } from "lemmy-js-client";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { UserService } from "../../services";

export default function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
