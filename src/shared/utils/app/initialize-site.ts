import { GetSiteResponse } from "lemmy-js-client";
import { setupEmojiDataModel, setupMarkdown } from "../../markdown";
import { UserService } from "../../services";
import { updateDataBsTheme } from "@utils/browser";

export default function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  updateDataBsTheme(site);
  if (site) {
    setupEmojiDataModel(site.custom_emojis ?? []);
  }
  setupMarkdown();
}
