import { GetSiteResponse } from "lemmy-js-client";
import { UserService } from "../../services";
import amAdmin from "./am-admin";

export default function canCreateCommunity(
  siteRes: GetSiteResponse,
  myUserInfo = UserService.Instance.myUserInfo
): boolean {
  const adminOnly = siteRes.site_view.local_site.community_creation_admin_only;
  // TODO: Make this check if user is logged on as well
  return !adminOnly || amAdmin(myUserInfo);
}
