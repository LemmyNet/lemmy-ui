import { getBaseLocal } from "@utils/env";

export default function getHttpBaseInternal() {
  return getBaseLocal(); // Don't use secure here
}
