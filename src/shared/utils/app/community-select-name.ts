import { hostname } from "@utils/helpers";
import { CommunityView } from "lemmy-js-client";

export default function communitySelectName(cv: CommunityView): string {
  return cv.community.local
    ? cv.community.title
    : `${hostname(cv.community.actor_id)}/${cv.community.title}`;
}
