import { PersonView } from "lemmy-js-client";

export function isAdmin(creatorId: number, admins?: PersonView[]): boolean {
  return admins?.map(a => a.person.id).includes(creatorId) ?? false;
}
