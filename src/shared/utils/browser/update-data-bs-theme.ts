import { GetSiteResponse } from "lemmy-js-client";
import isBrowser from "./is-browser";
import dataBsTheme from "./data-bs-theme";

export default function updateDataBsTheme(siteRes?: GetSiteResponse) {
  if (isBrowser()) {
    document
      .getElementById("app")
      ?.setAttribute("data-bs-theme", dataBsTheme(siteRes));
  }
}
