import { Person } from "lemmy-js-client";

export default function isBanned(ps: Person): boolean {
  return ps.banned;
}
