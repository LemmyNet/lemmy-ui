import * as cookie from "cookie";
import { authCookieName } from "../../config";

export default function clearAuthCookie() {
  document.cookie = cookie.serialize(authCookieName, "", {
    maxAge: -1,
    sameSite: true,
    path: "/",
  });
}
