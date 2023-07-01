// import Cookies from 'js-cookie';
import { isAuthPath } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { isHttps } from "@utils/env";
import * as cookie from "cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { toast } from "../toast";
import { I18NextService } from "./I18NextService";

interface Claims {
  sub: number;
  iss: string;
  iat: number;
}

interface JwtInfo {
  claims: Claims;
  jwt: string;
}

export class UserService {
  static #instance: UserService;
  public myUserInfo?: MyUserInfo;
  public jwtInfo?: JwtInfo;

  private constructor() {
    this.#setJwtInfo();
  }

  public login(res: LoginResponse) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 365);
    if (isBrowser() && res.jwt) {
      toast(I18NextService.i18n.t("logged_in"));
      document.cookie = cookie.serialize("jwt", res.jwt, {
        expires,
        secure: isHttps(),
        domain: location.hostname,
        sameSite: true,
        path: "/",
      });
      this.#setJwtInfo();
    }
  }

  public logout() {
    this.jwtInfo = undefined;
    this.myUserInfo = undefined;
    if (isBrowser()) {
      document.cookie = cookie.serialize("jwt", "", {
        maxAge: 0,
        path: "/",
        domain: location.hostname,
        sameSite: true,
      });
    }
    if (isAuthPath(location.pathname)) {
      location.replace("/");
    } else {
      location.reload();
    }
  }

  public auth(throwErr = false): string | undefined {
    const jwt = this.jwtInfo?.jwt;
    if (jwt) {
      return jwt;
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

  #setJwtInfo() {
    if (isBrowser()) {
      const { jwt } = cookie.parse(document.cookie);
      if (jwt) {
        this.jwtInfo = { jwt, claims: jwt_decode(jwt) };
      }
    }
  }

  public static get Instance() {
    return this.#instance || (this.#instance = new this());
  }
}
