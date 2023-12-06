import { amAdmin } from "@utils/roles";
import { GetSiteResponse } from "lemmy-js-client";

export default function canCreateCommunity(siteRes: GetSiteResponse): boolean {
  const adminOnly = siteRes.site_view.local_site.community_creation_admin_only;
  // TODO: Make this check if user is logged on as well
  return !adminOnly || amAdmin(siteRes.my_user);
}
