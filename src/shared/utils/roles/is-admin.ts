import { PersonView } from "lemmy-js-client";

export default function isAdmin(
  creatorId: number,
  admins?: PersonView[],
): boolean {
  return admins?.some(({ person: { id } }) => id === creatorId) ?? false;
}
