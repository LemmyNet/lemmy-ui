import { getHttpBase } from "@utils/env";
import { LemmyHttp, LoginResponse } from "lemmy-js-client";
import { toast } from "../toast";
import { I18NextService } from "./I18NextService";
import { clearAuthCookie, isBrowser, setAuthCookie } from "@utils/browser";
import { isAuthPath } from "@utils/app";
import cookie from "cookie";
import { authCookieName } from "../config";

export const EMPTY_REQUEST = {
  state: "empty",
} as const;

export type EmptyRequestState = typeof EMPTY_REQUEST;

export const LOADING_REQUEST = {
  state: "loading",
} as const;

type LoadingRequestState = typeof LOADING_REQUEST;

export type FailedRequestState = {
  state: "failed";
  err: Error;
};

type SuccessRequestState<T> = {
  state: "success";
  data: T;
};

/**
 * Shows the state of an API request.
 *
 * Can be empty, loading, failed, or success
 */
export type RequestState<T> =
  | EmptyRequestState
  | LoadingRequestState
  | FailedRequestState
  | SuccessRequestState<T>;

export type WrappedLemmyHttp = WrappedLemmyHttpClient & {
  [K in keyof LemmyHttp]: LemmyHttp[K] extends (...args: any[]) => any
    ? ReturnType<LemmyHttp[K]> extends Promise<infer U>
      ? (...args: Parameters<LemmyHttp[K]>) => Promise<RequestState<U>>
      : (
          ...args: Parameters<LemmyHttp[K]>
        ) => Promise<RequestState<LemmyHttp[K]>>
    : LemmyHttp[K];
};

class WrappedLemmyHttpClient {
  rawClient: LemmyHttp;

  constructor(client: LemmyHttp, silent = false) {
    this.rawClient = client;

    for (const key of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this.rawClient),
    )) {
      if (key !== "constructor") {
        this[key] = async (...args: any) => {
          try {
            const res = await this.rawClient[key](...args);

            return {
              data: res,
              state: !(res === undefined || res === null) ? "success" : "empty",
            };
          } catch (error) {
            if (!silent) {
              console.error(`API error: ${error}`);
              toast(I18NextService.i18n.t(error), "danger");
            }
            return {
              state: "failed",
              err: error,
            };
          }
        };
      }
    }
  }
}

export function wrapClient(client: LemmyHttp, silent = false) {
  // unfortunately, this verbose cast is necessary
  return new WrappedLemmyHttpClient(
    client,
    silent,
  ) as unknown as WrappedLemmyHttp;
}

// TODO These are unused for now
// interface Claims {
//   sub: number;
//   iss: string;
//   iat: number;
// }

// interface AuthInfo {
//   claims: Claims;
//   auth: string;
// }

export class HttpService {
  static #_instance: HttpService;
  #silent_client: WrappedLemmyHttp;
  #client: WrappedLemmyHttp;

  private constructor() {
    const lemmyHttp = new LemmyHttp(getHttpBase());
    const auth = cookie.parse(document.cookie)[authCookieName];

    if (auth) {
      HttpService.client.setHeaders({ Authorization: `Bearer ${auth}` });
    }
    this.#client = wrapClient(lemmyHttp);
    this.#silent_client = wrapClient(lemmyHttp, true);
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
    }
  }

  public logout() {
    if (isBrowser()) {
      clearAuthCookie();
    }

    this.#client.logout();

    if (isAuthPath(location.pathname)) {
      location.replace("/");
    } else {
      location.reload();
    }
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get client() {
    return this.#Instance.#client;
  }

  public static get silent_client() {
    return this.#Instance.#silent_client;
  }
}
