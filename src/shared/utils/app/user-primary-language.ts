import { UserService } from "../../services";

export default function getUserPrimaryLanguage(
  myUserInfo = UserService.Instance.myUserInfo
): number {
  // Get first language in discussion languages array that isn't equal to "0",
  // which is the language selection "Undetermined"
  return myUserInfo?.discussion_languages.find(lang => lang !== 0) || 0;
}
