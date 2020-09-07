// import Cookies from 'js-cookie';
import IsomorphicCookie from 'isomorphic-cookie';
import { User, LoginResponse } from 'lemmy-js-client';
import { setTheme } from '../utils';
import jwt_decode from 'jwt-decode';
import { Subject, BehaviorSubject } from 'rxjs';

interface Claims {
  id: number;
  iss: string;
}

export class UserService {
  private static _instance: UserService;
  public user: User;
  public claims: Claims;
  public jwtSub: Subject<string> = new Subject<string>();
  public unreadCountSub: BehaviorSubject<number> = new BehaviorSubject<number>(
    0
  );

  private constructor() {
    let jwt = IsomorphicCookie.load('jwt');
    if (jwt) {
      this.setClaims(jwt);
    } else {
      // setTheme();
      console.log('No JWT cookie found.');
    }
  }

  public login(res: LoginResponse) {
    this.setClaims(res.jwt);
    IsomorphicCookie.save('jwt', res.jwt, { expires: 365 });
    console.log('jwt cookie set');
  }

  public logout() {
    this.claims = undefined;
    this.user = undefined;
    IsomorphicCookie.remove('jwt');
    // setTheme();
    this.jwtSub.next();
    console.log('Logged out.');
  }

  public get auth(): string {
    return IsomorphicCookie.load('jwt');
  }

  private setClaims(jwt: string) {
    this.claims = jwt_decode(jwt);
    this.jwtSub.next(jwt);
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
