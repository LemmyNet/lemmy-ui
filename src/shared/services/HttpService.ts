import { getHttpBase } from "@utils/env";
import { LemmyHttp } from "lemmy-js-client";
import { toast } from "../toast";
import { I18NextService } from "./I18NextService";

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
  msg: string;
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

export type WrappedLemmyHttp = {
  [K in keyof LemmyHttp]: LemmyHttp[K] extends (...args: any[]) => any
    ? ReturnType<LemmyHttp[K]> extends Promise<infer U>
      ? (...args: Parameters<LemmyHttp[K]>) => Promise<RequestState<U>>
      : (
          ...args: Parameters<LemmyHttp[K]>
        ) => Promise<RequestState<LemmyHttp[K]>>
    : LemmyHttp[K];
};

class WrappedLemmyHttpClient {
  #client: LemmyHttp;

  constructor(client: LemmyHttp, silent = false) {
    this.#client = client;

    for (const key of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this.#client),
    )) {
      if (key !== "constructor") {
        WrappedLemmyHttpClient.prototype[key] = async (...args) => {
          try {
            const res = await this.#client[key](...args);

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
              msg: error,
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

export class HttpService {
  static #_instance: HttpService;
  #silent_client: WrappedLemmyHttp;
  #client: WrappedLemmyHttp;

  private constructor() {
    const lemmyHttp = new LemmyHttp(getHttpBase());
    this.#client = wrapClient(lemmyHttp);
    this.#silent_client = wrapClient(lemmyHttp, true);
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
