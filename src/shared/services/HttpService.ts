import { getBackendHostExternal } from "@utils/env";
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
  // undefined and null produce an EmptyRequestState
  | (T extends null | undefined | void ? never : SuccessRequestState<T>);

export type WrappedLemmyHttp = WrappedLemmyHttpClient & {
  [K in keyof LemmyHttp]: LemmyHttp[K] extends (...args: unknown[]) => unknown
    ? (
        ...args: Parameters<LemmyHttp[K]>
      ) => Promise<RequestState<Awaited<ReturnType<LemmyHttp[K]>>>>
    : never;
};

function getHttpClientFunctionNames(): Set<keyof LemmyHttp> {
  const properties = new Set<keyof LemmyHttp>();
  let proto: object = LemmyHttp.prototype;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto)
      .filter(name => name !== "constructor")
      .filter(name => typeof LemmyHttp.prototype[name] === "function")
      .forEach(name => properties.add(name as keyof LemmyHttp));
    proto = Object.getPrototypeOf(proto) as object;
  }
  return properties;
}

class WrappedLemmyHttpClient {
  rawClient: LemmyHttp;

  constructor(client: LemmyHttp) {
    this.rawClient = client;

    for (const key of getHttpClientFunctionNames()) {
      this[key] = async (...args: unknown[]) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          const res = (await (this.rawClient[key] as CallableFunction)(
            ...args,
          )) as unknown;

          return {
            data: res,
            state: !(res === undefined || res === null) ? "success" : "empty",
          };
        } catch (error) {
          return {
            state: "failed",
            err: error as Error,
          };
        }
      };
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
    const lemmyHttp = new LemmyHttp(getBackendHostExternal());
    this.#client = wrapClient(lemmyHttp);
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get client() {
    return this.#Instance.#client;
  }
}
