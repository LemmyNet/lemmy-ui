import { getBackendHostExternal } from "@utils/env";
import { LemmyHttp } from "lemmy-js-client";
import type {
  Badge,
  BadgeResponse,
  ListBadgesResponse,
  CreateBadge,
  EditBadge,
  AssignBadge,
  RemoveBadge,
  BadgeActionResponse,
} from "@utils/types";

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
        this[key] = async (...args: any) => {
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
    const lemmyHttp = new LemmyHttp(getBackendHostExternal());
    this.#client = wrapClient(lemmyHttp);
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get client() {
    return this.#Instance.#client;
  }

  // Badge API methods
  public static async listBadges(): Promise<RequestState<ListBadgesResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge/list`,
        {
          method: "GET",
          headers: this.#Instance.#getHeaders(),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  public static async createBadge(
    form: CreateBadge,
  ): Promise<RequestState<BadgeResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge`,
        {
          method: "POST",
          headers: this.#Instance.#getHeaders(),
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  public static async updateBadge(
    form: EditBadge,
  ): Promise<RequestState<BadgeResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge`,
        {
          method: "PUT",
          headers: this.#Instance.#getHeaders(),
          body: JSON.stringify(form),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  public static async deleteBadge(
    badge_id: number,
  ): Promise<RequestState<BadgeActionResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge`,
        {
          method: "DELETE",
          headers: this.#Instance.#getHeaders(),
          body: JSON.stringify({ id: badge_id }),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  public static async assignBadge(
    person_id: number,
    badge_id: number,
  ): Promise<RequestState<BadgeActionResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge/assign`,
        {
          method: "POST",
          headers: this.#Instance.#getHeaders(),
          body: JSON.stringify({ person_id, badge_id }),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  public static async removeBadge(
    person_id: number,
    badge_id: number,
  ): Promise<RequestState<BadgeActionResponse>> {
    try {
      const response = await fetch(
        `${getBackendHostExternal()}/api/v3/badge/remove`,
        {
          method: "POST",
          headers: this.#Instance.#getHeaders(),
          body: JSON.stringify({ person_id, badge_id }),
        },
      );
      const data = await response.json();
      return { state: "success", data };
    } catch (err) {
      return { state: "failed", err: err as Error };
    }
  }

  #getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
    };
  }
}
