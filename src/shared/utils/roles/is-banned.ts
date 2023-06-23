import { Person } from "lemmy-js-client";

export default function isBanned(ps: Person): boolean {
  const expires = ps.ban_expires;
  // Add Z to convert from UTC date
  // TODO this check probably isn't necessary anymore
  if (expires) {
    if (ps.banned && new Date(expires + "Z") > new Date()) {
      return true;
    } else {
      return false;
    }
  } else {
    return ps.banned;
  }
}
