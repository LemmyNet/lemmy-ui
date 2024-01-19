import { getHttpBase } from "@utils/env";
import { LemmyHttp } from "lemmy-js-client";

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

  constructor(client: LemmyHttp) {
    this.rawClient = client;

    for (const key of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this.rawClient),
    )) {
      if (key !== "constructor") {
        this[key] = async (...args) => {
          try {
            const res = await this.rawClient[key](...args);

            return {
              data: res,
              state: !(res === undefined || res === null) ? "success" : "empty",
            };
          } catch (error) {
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

export function wrapClient(client: LemmyHttp) {
  // unfortunately, this verbose cast is necessary
  return new WrappedLemmyHttpClient(client) as unknown as WrappedLemmyHttp;
}

export class HttpService {
  static #_instance: HttpService;
  #client: WrappedLemmyHttp;

  private constructor() {
    const lemmyHttp = new LemmyHttp(getHttpBase());
    this.#client = wrapClient(lemmyHttp);
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get client() {
    return this.#Instance.#client;
  }
}
