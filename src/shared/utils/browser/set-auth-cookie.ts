import { isHttps } from "@utils/env";
import * as cookie from "cookie";
import { authCookieName } from "../../config";

export default function setAuthCookie(jwt: string) {
  document.cookie = cookie.serialize(authCookieName, jwt, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    secure: isHttps(),
    sameSite: "lax",
    path: "/",
  });
}
