import { Person } from "lemmy-js-client";

export function getUserFlair(
  user: Person
): string | null {
  if(user.name === 'Nerd02') return "🟥🟦 - AuthCenter";

  // return "🟩 - LibLeft";
  return null;
}


