import Cookies from "js-cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { BehaviorSubject } from "rxjs";
import { isHttps } from "../env";
import { i18n } from "../i18next";
import { isAuthPath, isBrowser, toast } from "../utils";

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
  private static _instance: UserService;
  public myUserInfo?: MyUserInfo;
  public jwtInfo?: JwtInfo;
  public unreadInboxCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadReportCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadApplicationCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  private constructor() {
    this.setJwtInfo();
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 365);
    if (res.jwt) {
      toast(i18n.t("logged_in"));
      Cookies.set("jwt", res.jwt, {
        expires,
        secure: isHttps(),
        sameSite: "Strict",
      });
      this.setJwtInfo();
    }
  }

  public logout() {
    this.jwtInfo = undefined;
    this.myUserInfo = undefined;
    Cookies.remove("jwt");
    if (isAuthPath(location.pathname)) {
      location.replace("/");
    } else {
      location.reload();
    }
  }

  public auth(throwErr = true): string | undefined {
    let jwt = this.jwtInfo?.jwt;
    if (jwt) {
      return jwt;
    } else {
      let msg = "No JWT cookie found";
      if (throwErr && isBrowser()) {
        console.error(msg);
        toast(i18n.t("not_logged_in"), "danger");
      }
      return undefined;
      // throw msg;
    }
  }

  private setJwtInfo() {
    let jwt = Cookies.get("jwt");

    if (jwt) {
      this.jwtInfo = { jwt, claims: jwt_decode(jwt) };
    }
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
