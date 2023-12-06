import { MyUserInfo } from "lemmy-js-client";
import amAdmin from "./am-admin";

export default function moderatesSomething(myUserInfo?: MyUserInfo): boolean {
  return amAdmin(myUserInfo) || (myUserInfo?.moderates?.length ?? 0) > 0;
}
