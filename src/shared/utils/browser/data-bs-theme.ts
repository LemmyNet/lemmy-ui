import { GetSiteResponse } from "lemmy-js-client";
import isDark from "./is-dark";

export default function dataBsTheme(siteResOrTheme?: GetSiteResponse | string) {
  const theme =
    typeof siteResOrTheme === "string"
      ? siteResOrTheme
      : (siteResOrTheme?.my_user?.local_user_view.local_user.theme ??
        siteResOrTheme?.site_view.local_site.default_theme ??
        "browser");

  return (isDark() && theme === "browser") || theme.includes("dark")
    ? "dark"
    : "light";
}
