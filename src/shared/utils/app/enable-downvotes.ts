import { GetSiteResponse } from "lemmy-js-client";

export default function enableDownvotes(siteRes: GetSiteResponse): boolean {
  return siteRes.site_view.local_site.enable_downvotes;
}
