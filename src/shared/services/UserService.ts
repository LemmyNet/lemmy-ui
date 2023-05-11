// import Cookies from 'js-cookie';
import IsomorphicCookie from "isomorphic-cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { BehaviorSubject } from "rxjs";
import { isHttps } from "../env";
import { i18n } from "../i18next";
import { isBrowser, toast } from "../utils";

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
  public unreadInboxCountSub: BehaviorSubject<bigint> =
    new BehaviorSubject<bigint>(0n);
  public unreadReportCountSub: BehaviorSubject<bigint> =
    new BehaviorSubject<bigint>(0n);
  public unreadApplicationCountSub: BehaviorSubject<bigint> =
    new BehaviorSubject<bigint>(0n);

  private constructor() {
    this.setJwtInfo();
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 365);
    if (res.jwt) {
      toast(i18n.t("logged_in"));
      IsomorphicCookie.save("jwt", res.jwt, { expires, secure: isHttps() });
      this.setJwtInfo();
    }
  }

  public logout() {
    this.jwtInfo = undefined;
    this.myUserInfo = undefined;
    IsomorphicCookie.remove("jwt"); // TODO is sometimes unreliable for some reason
    document.cookie = "jwt=; Max-Age=0; path=/; domain=" + location.hostname;
    location.reload();
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
    let jwt: string | undefined = IsomorphicCookie.load("jwt");

    if (jwt) {
      this.jwtInfo = { jwt, claims: jwt_decode(jwt) };
    }
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
