import { MyUserInfo } from "lemmy-js-client";
import { setupMarkdown } from "../../markdown";
import { UserService } from "../../services";

export default function initializeSite(myUser?: MyUserInfo) {
  UserService.Instance.myUserInfo = myUser;
  setupMarkdown();
}
