import { isHttps } from "@utils/env";
import * as cookie from "cookie";
import { authCookieName } from "../../config";

export default function setAuthCookie(jwt: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 365);

  document.cookie = cookie.serialize(authCookieName, jwt, {
    expires,
    secure: isHttps(),
    sameSite: true,
    path: "/",
  });
}
