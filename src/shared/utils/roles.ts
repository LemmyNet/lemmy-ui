import {
  CommentSlimView,
  CommentView,
  CommunityModeratorView,
  CommunityView,
  LocalSite,
  MyUserInfo,
  PersonView,
  PostView,
} from "lemmy-js-client";
import { userNotLoggedInOrBanned } from "./app";

export function amAdmin(myUserInfo: MyUserInfo | undefined): boolean {
  return myUserInfo?.local_user_view.local_user.admin ?? false;
}

export function amTopMod(
  mods: CommunityModeratorView[] | undefined,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId === mods?.at(0)?.moderator.id;
}

export function amTopModExcludeMe(
  creator_id: number,
  mods: CommunityModeratorView[] | undefined,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  // Don't allow mod actions on yourself
  const myId = myUserInfo?.local_user_view.person.id;
  return amTopMod(mods, myUserInfo) && myId !== creator_id;
}

export function amHigherModerator(
  mods: CommunityModeratorView[],
  mod: CommunityModeratorView,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const myPosition = mods.findIndex(
    m => m.moderator.id === myUserInfo?.local_user_view.person.id,
  );
  const modPosition = mods.findIndex(m => m.moderator.id === mod.moderator.id);

  return (
    myPosition < modPosition ||
    (myUserInfo?.local_user_view.local_user.admin ?? false)
  );
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

export function moderatesPrivateCommunity(
  myUserInfo: MyUserInfo | undefined,
): boolean {
  return (
    myUserInfo?.moderates?.some(c => c.community.visibility === "private") ??
    false
  );
}

export function canCreateCommunity(
  localSite: LocalSite,
  myUserInfo: MyUserInfo | undefined,
): boolean {
  const adminOnly = localSite.community_creation_admin_only;
  const disableInput_ = userNotLoggedInOrBanned(myUserInfo);
  return (!adminOnly && !disableInput_) || amAdmin(myUserInfo);
}
