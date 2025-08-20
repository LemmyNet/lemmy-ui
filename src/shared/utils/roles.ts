import {
  CommentSlimView,
  CommentView,
  CommunityModeratorView,
  CommunityView,
  GetSiteResponse,
  MyUserInfo,
  PersonView,
  PostView,
} from "lemmy-js-client";

export function amAdmin(myUserInfo: MyUserInfo | undefined): boolean {
  return myUserInfo?.local_user_view.local_user.admin ?? false;
}

export function amCommunityCreator(
  creator_id: number,
  mods: CommunityModeratorView[] | undefined,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  // Don't allow mod actions on yourself
  return myId === mods?.at(0)?.moderator.id && myId !== creator_id;
}

export function amMod(
  thing: PostView | CommentSlimView | CommentView | CommunityView,
): boolean {
  return thing.can_mod;
}

export function amSiteCreator(
  creator_id: number,
  admins: PersonView[],
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId === admins?.at(0)?.person.id && myId !== creator_id;
}

export function amTopMod(
  mods: CommunityModeratorView[],
  myUserInfo: MyUserInfo | undefined,
): boolean {
  return mods.at(0)?.moderator.id === myUserInfo?.local_user_view.person.id;
}

export function canAdmin(
  creatorId: number,
  admins: PersonView[],
  myUserInfo: MyUserInfo | undefined,
  onSelf = false,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  if (!myId) {
    return false;
  }
  if (onSelf && creatorId !== myId) {
    return false;
  }
  const first =
    admins &&
    admins.find(x => x.person.id === creatorId || x.person.id === myId);
  // You can do admin actions only on admins added after you.
  return first?.person.id === myId;
}

export function moderatesSomething(
  myUserInfo: MyUserInfo | undefined,
): boolean {
  return amAdmin(myUserInfo) || (myUserInfo?.moderates?.length ?? 0) > 0;
}

export function canCreateCommunity(
  siteRes: GetSiteResponse,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const adminOnly = siteRes.site_view.local_site.community_creation_admin_only;
  const loggedIn = !!myUserInfo;
  return (!adminOnly && loggedIn) || amAdmin(myUserInfo);
}
