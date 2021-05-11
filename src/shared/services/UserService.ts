// import Cookies from 'js-cookie';
import IsomorphicCookie from "isomorphic-cookie";
import { LocalUserSettingsView, LoginResponse } from "lemmy-js-client";
import jwt_decode from "jwt-decode";
import { Subject, BehaviorSubject } from "rxjs";

interface Claims {
  sub: number;
  iss: string;
  iat: number;
}

export class UserService {
  private static _instance: UserService;
  public localUserView: LocalUserSettingsView;
  public claims: Claims;
  public jwtSub: Subject<string> = new Subject<string>();
  public unreadCountSub: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  private constructor() {
    if (this.auth) {
      this.setClaims(this.auth);
    } else {
      // setTheme();
      console.log("No JWT cookie found.");
    }
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 365);
    IsomorphicCookie.save("jwt", res.jwt, { expires, secure: false });
    console.log("jwt cookie set");
    this.setClaims(res.jwt);
  }

  public logout() {
    IsomorphicCookie.remove("jwt", { secure: false });
    this.claims = undefined;
    this.localUserView = undefined;
    // setTheme();
    this.jwtSub.next("");
    console.log("Logged out.");
  }

  public get auth(): string {
    return IsomorphicCookie.load("jwt");
  }

  private setClaims(jwt: string) {
    this.claims = jwt_decode(jwt);
    this.jwtSub.next(jwt);
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
