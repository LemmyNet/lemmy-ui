import {
  CommunityId,
  CommunityModeratorView,
  GetSiteResponse,
  MyUserInfo,
  PersonView,
} from "lemmy-js-client";

export function amAdmin(myUserInfo?: MyUserInfo): boolean {
  return myUserInfo?.local_user_view.local_user.admin ?? false;
}

export function amCommunityCreator(
  creator_id: number,
  mods?: CommunityModeratorView[],
  myUserInfo?: MyUserInfo,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  // Don't allow mod actions on yourself
  return myId === mods?.at(0)?.moderator.id && myId !== creator_id;
}

export function amMod(
  communityId: CommunityId,
  myUserInfo?: MyUserInfo,
): boolean {
  return myUserInfo
    ? myUserInfo.moderates.some(cmv => cmv.community.id === communityId)
    : false;
}

export function amSiteCreator(
  creator_id: number,
  admins?: PersonView[],
  myUserInfo?: MyUserInfo,
): boolean {
  const myId = myUserInfo?.local_user_view.person.id;
  return myId === admins?.at(0)?.person.id && myId !== creator_id;
}

export function amTopMod(
  mods: CommunityModeratorView[],
  myUserInfo?: MyUserInfo,
): boolean {
  return mods.at(0)?.moderator.id === myUserInfo?.local_user_view.person.id;
}

export function canAdmin(
  creatorId: number,
  admins?: PersonView[],
  myUserInfo?: MyUserInfo,
  onSelf = false,
): boolean {
  return canMod(creatorId, undefined, admins, myUserInfo, onSelf);
}

export function moderatesSomething(myUserInfo?: MyUserInfo): boolean {
  return amAdmin(myUserInfo) || (myUserInfo?.moderates?.length ?? 0) > 0;
}

export function canCreateCommunity(
  siteRes: GetSiteResponse,
  myUserInfo?: MyUserInfo,
): boolean {
  const adminOnly = siteRes.site_view.local_site.community_creation_admin_only;
  // TODO: Make this check if user is logged on as well
  return !adminOnly || amAdmin(myUserInfo);
}

// TODO get rid of this, as its in the back-end now
export function canMod(
  creator_id: number,
  mods?: CommunityModeratorView[],
  admins?: PersonView[],
  myUserInfo?: MyUserInfo,
  onSelf = false,
): boolean {
  // You can do moderator actions only on the mods added after you.
  let adminsThenMods =
    admins
      ?.map(a => a.person.id)
      .concat(mods?.map(m => m.moderator.id) ?? []) ?? [];

  if (myUserInfo) {
    const myIndex = adminsThenMods.findIndex(
      id => id === myUserInfo.local_user_view.person.id,
    );
    if (myIndex === -1) {
      return false;
    } else {
      // onSelf +1 on mod actions not for yourself, IE ban, remove, etc
      adminsThenMods = adminsThenMods.slice(0, myIndex + (onSelf ? 0 : 1));
      return !adminsThenMods.includes(creator_id);
    }
  } else {
    return false;
  }
}
