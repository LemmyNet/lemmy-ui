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
  private static _instance: HttpService;
  private client: LemmyHttp;

  private constructor() {
    this.client = new LemmyHttp(getHttpBase());
  }

  private static get Instance() {
    return this._instance || (this._instance = new this());
  }

  public static get client() {
    return this.Instance.client;
  }
}
