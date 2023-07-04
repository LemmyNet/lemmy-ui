import { MyUserInfo } from "lemmy-js-client";
import isDark from "./is-dark";

export default function dataBsTheme(user?: MyUserInfo) {
  return (isDark() && user?.local_user_view.local_user.theme === "browser") ||
    (user &&
      [
        "darkly",
        "darkly-red",
        "darkly-pureblack",
        "darkly-compact",
        "i386",
      ].includes(user.local_user_view.local_user.theme))
    ? "dark"
    : "light";
}
