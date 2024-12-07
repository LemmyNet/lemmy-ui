import { GetSiteResponse } from "lemmy-js-client";
import { setupMarkdown } from "../../markdown";
import { UserService } from "../../services";

export default function initializeSite(site?: GetSiteResponse) {
  UserService.Instance.myUserInfo = site?.my_user;
  setupMarkdown();
}
