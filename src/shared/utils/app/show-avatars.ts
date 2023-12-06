import { MyUserInfo } from "lemmy-js-client";

export default function showAvatars(myUserInfo?: MyUserInfo): boolean {
  return myUserInfo?.local_user_view.local_user.show_avatars ?? true;
}
