import {
  CommunityModeratorView,
  MyUserInfo,
  PersonView,
} from "lemmy-js-client";

export default function canMod(
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
