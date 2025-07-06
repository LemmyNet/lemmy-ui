import { GetSiteResponse, MyUserInfo } from "lemmy-js-client";
import isDark from "./is-dark";

type ThemeParams =
  | string
  | {
      siteRes: GetSiteResponse;
      myUser?: MyUserInfo;
    };

export default function dataBsTheme(themeParams?: ThemeParams) {
  const theme =
    typeof themeParams === "string"
      ? themeParams
      : (themeParams?.myUser?.local_user_view.local_user.theme ??
        themeParams?.siteRes.site_view.local_site.default_theme ??
        "browser");

  return (isDark() && theme === "browser") || theme.includes("dark")
    ? "dark"
    : "light";
}
