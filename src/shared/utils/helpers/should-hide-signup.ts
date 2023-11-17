import { GetSiteResponse } from "lemmy-js-client";

export default function shouldHideSignup(siteRes?: GetSiteResponse) {
  return (
    siteRes?.site_view.local_site.registration_mode === "Closed" ||
    siteRes?.site_view.local_site.private_instance
  );
}
