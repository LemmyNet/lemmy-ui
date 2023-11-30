import { isAuthPath } from "@utils/app";
import { clearAuthCookie, isBrowser, setAuthCookie } from "@utils/browser";
import * as cookie from "cookie";
import { jwtDecode } from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { toast } from "../toast";
import { I18NextService } from "./I18NextService";
import { amAdmin } from "@utils/roles";
import { HttpService } from ".";
import { authCookieName } from "../config";

interface Claims {
  sub: number;
  iss: string;
  iat: number;
}

interface AuthInfo {
  claims: Claims;
  auth: string;
}

export class UserService {
  static #instance: UserService;
  public myUserInfo?: MyUserInfo;
  public authInfo?: AuthInfo;

  private constructor() {
    this.#setAuthInfo();
  }

  public login({
    res,
    showToast = true,
  }: {
    res: LoginResponse;
    showToast?: boolean;
  }) {
    if (isBrowser() && res.jwt) {
      showToast && toast(I18NextService.i18n.t("logged_in"));
      setAuthCookie(res.jwt);
      this.#setAuthInfo();
    }
  }

  public logout() {
    this.authInfo = undefined;
    this.myUserInfo = undefined;

    if (isBrowser()) {
      clearAuthCookie();
    }

    HttpService.client.logout();

    if (isAuthPath(location.pathname)) {
      location.replace("/");
    } else {
      location.reload();
    }
  }

  public auth(throwErr = false): string | undefined {
    const auth = this.authInfo?.auth;

    if (auth) {
      return auth;
    } else {
      const msg = "No JWT cookie found";

      if (throwErr && isBrowser()) {
        console.error(msg);
        toast(I18NextService.i18n.t("not_logged_in"), "danger");
      }

      return undefined;
      // throw msg;
    }
  }

  #setAuthInfo() {
    if (isBrowser()) {
      const auth = cookie.parse(document.cookie)[authCookieName];

      if (auth) {
        HttpService.client.setHeaders({ Authorization: `Bearer ${auth}` });
        this.authInfo = { auth, claims: jwtDecode(auth) };
      }
    }
  }

  public get moderatesSomething(): boolean {
    return amAdmin() || (this.myUserInfo?.moderates?.length ?? 0) > 0;
  }

  public static get Instance() {
    return this.#instance || (this.#instance = new this());
  }
}
