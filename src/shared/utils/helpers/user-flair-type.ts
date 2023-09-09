import { Person } from "lemmy-js-client";

export interface UserFlairType {
  id: string;
  name: string;
  image: string;
}

let currentFlair: UserFlairType | null = { id: "1", name: "AuthCenter", image: 'https://emoji.redditmedia.com/16q94zxonar31_t5_3ipa1/auth' };

export function getUserFlair(user: Person | null): UserFlairType | null {
  if (user === null) return null;

  if (user.name === 'Nerd02') return currentFlair;

  return null;
}

export function setUserFlair(newUserFlair: UserFlairType) {
  currentFlair = newUserFlair;
}

export function clearUserFlair() {
  currentFlair = null;
}
