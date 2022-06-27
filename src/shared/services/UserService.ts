// import Cookies from 'js-cookie';
import { Err, None, Ok, Option, Result, Some } from "@sniptt/monads";
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
  public myUserInfo: Option<MyUserInfo> = None;
  public jwtInfo: Option<JwtInfo> = None;
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
    res.jwt.match({
      some: jwt => {
        toast(i18n.t("logged_in"));
        IsomorphicCookie.save("jwt", jwt, { expires, secure: isHttps });
        this.setJwtInfo();
        location.reload();
      },
      none: void 0,
    });
  }

  public logout() {
    this.jwtInfo = None;
    this.myUserInfo = None;
    IsomorphicCookie.remove("jwt"); // TODO is sometimes unreliable for some reason
    document.cookie = "jwt=; Max-Age=0; path=/; domain=" + location.host;
    location.reload();
  }

  public auth(throwErr = true): Result<string, string> {
    // Can't use match to convert to result for some reason
    let jwt = this.jwtInfo.map(j => j.jwt);
    if (jwt.isSome()) {
      return Ok(jwt.unwrap());
    } else {
      let msg = "No JWT cookie found";
      if (throwErr && isBrowser()) {
        console.log(msg);
        toast(i18n.t("not_logged_in"), "danger");
      }
      return Err(msg);
    }
  }

  private setJwtInfo() {
    let jwt = IsomorphicCookie.load("jwt");

    if (jwt) {
      let jwtInfo: JwtInfo = { jwt, claims: jwt_decode(jwt) };
      this.jwtInfo = Some(jwtInfo);
    }
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
