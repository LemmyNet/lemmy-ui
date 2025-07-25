import { parseISO } from "date-fns";

export default function isBanned(receivedAt?: string, expiresAt?: string) {
  if (!receivedAt) {
    return false;
  } else if (!expiresAt) {
    return true;
  } else {
    const expiryDate = parseISO(expiresAt);
    return expiryDate <= new Date();
  }
}
