import { isAuthPath } from "@utils/app";
import { clearAuthCookie, isBrowser, setAuthCookie } from "@utils/browser";
import * as cookie from "cookie";
import { jwtDecode } from "jwt-decode";
import { LoginResponse } from "lemmy-js-client";
import { toast } from "@utils/app";
import { I18NextService } from "./I18NextService";
import { HttpService } from ".";
import { authCookieName } from "@utils/config";

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
  public authInfo?: AuthInfo;

  private constructor() {}

  static async init() {
    const s = new this();
    await s.#setAuthInfo();
    return s;
  }

  public async login({
    res,
    showToast = true,
  }: {
    res: LoginResponse;
    showToast?: boolean;
  }) {
    if (isBrowser() && res.jwt) {
      if (showToast) {
        toast(I18NextService.i18n.t("logged_in"));
      }
      setAuthCookie(res.jwt);
      await this.#setAuthInfo();
    }
  }

  public async logout() {
    this.authInfo = undefined;

    if (isBrowser()) {
      clearAuthCookie();
    }

    await HttpService.client.logout();

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

  async #setAuthInfo() {
    if (isBrowser()) {
      const auth = cookie.parse(document.cookie)[authCookieName];

      if (auth) {
        await HttpService.client.setHeaders({
          Authorization: `Bearer ${auth}`,
        });
        this.authInfo = { auth, claims: jwtDecode(auth) };
      }
    }
  }

  public static get Instance() {
    return instance;
  }
}

const instance: UserService = await UserService.init();
