import { LemmyHttp } from "lemmy-js-client";
import { getHttpBase } from "../../shared/env";
import { i18n } from "../../shared/i18next";
import { toast } from "../../shared/utils";

type EmptyRequestState = {
  state: "empty";
};

type LoadingRequestState = {
  state: "loading";
};

type FailedRequestState = {
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

type WrappedLemmyHttp = {
  [K in keyof LemmyHttp]: LemmyHttp[K] extends (...args: any[]) => any
    ? ReturnType<LemmyHttp[K]> extends Promise<infer U>
      ? (...args: Parameters<LemmyHttp[K]>) => Promise<RequestState<U>>
      : (
          ...args: Parameters<LemmyHttp[K]>
        ) => Promise<RequestState<LemmyHttp[K]>>
    : LemmyHttp[K];
};

export async function apiWrapper<ResponseType>(
  req: Promise<ResponseType>
): Promise<RequestState<ResponseType>> {
  try {
    const res = await req;
    return {
      state: "success",
      data: res,
    };
  } catch (error) {
    console.error(`API error: ${error}`);
    toast(i18n.t(error), "danger");
    return {
      state: "failed",
      msg: error,
    };
  }
}

class WrappedLemmyHttpClient {
  #client: LemmyHttp;

  constructor(client: LemmyHttp) {
    this.#client = client;

    for (const key of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this.#client)
    )) {
      WrappedLemmyHttpClient.prototype[key] = async (...args) => {
        try {
          const res = await this.#client[key](...args);

          return {
            data: res,
            state: "success",
          };
        } catch (error) {
          console.error(`API error: ${error}`);
          toast(i18n.t(error), "danger");
          return {
            state: "failed",
            msg: error,
          };
        }
      };
    }
  }
}

export function getWrappedClient(client: LemmyHttp) {
  return new WrappedLemmyHttpClient(client) as unknown as WrappedLemmyHttp; // unfortunately, this verbose cast is necessary
}

/**
 * A Special type of apiWrapper, used only for the iso routes.
 *
 * Necessary because constructors can't be async
 */
export function apiWrapperIso<ResponseType>(
  res: ResponseType
): RequestState<ResponseType> {
  try {
    return {
      state: "success",
      data: res,
    };
  } catch (error) {
    console.error(`API error: ${error}`);
    toast(i18n.t(error), "danger");
    return {
      state: "failed",
      msg: error,
    };
  }
}

export class HttpService {
  static #_instance: HttpService;
  #client: LemmyHttp;
  #wrappedClient: WrappedLemmyHttp;

  private constructor() {
    this.#client = new LemmyHttp(getHttpBase());
    this.#wrappedClient = getWrappedClient(this.#client);
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get client() {
    return this.#Instance.#client;
  }

  public static get wrappedClient() {
    return this.#Instance.#wrappedClient;
  }
}
