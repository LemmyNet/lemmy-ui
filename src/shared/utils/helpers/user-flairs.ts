import { Person } from "lemmy-js-client";

export interface UserFlair {
  id: string;
  name: string;
  image: string;
}

let currentFlair: UserFlair | null = {id: "1", name: "AuthCenter", image: 'https://emoji.redditmedia.com/16q94zxonar31_t5_3ipa1/auth'};

export function getUserFlair(user: Person | null): UserFlair | null {
  if(user === null) return null;
  
  if(user.name === 'Nerd02') return currentFlair;

  return null;
}

export function setUserFlair(newUserFlair: UserFlair) {
  currentFlair = newUserFlair;
}

export function clearUserFlair() {
  currentFlair = null;
}
