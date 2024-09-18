import { GetSiteResponse } from "lemmy-js-client";

export default function enableNsfw(siteRes: GetSiteResponse): boolean {
  return !!siteRes.site_view.site.content_warning;
}
