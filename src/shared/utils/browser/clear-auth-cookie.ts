import * as cookie from "cookie";
import { authCookieName } from "../../config";

export default function clearAuthCookie() {
  document.cookie = cookie.serialize(authCookieName, "", {
    expires: new Date("Thu, 01 Jan 1970 00:00:01 GMT"),
    maxAge: -1,
    sameSite: true,
    path: "/",
  });
}
