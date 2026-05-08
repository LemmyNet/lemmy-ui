import { getBackendHostExternal } from "@utils/env";
import { LemmyHttp } from "lemmy-js-client";

export type WrappedLemmyHttp = LemmyHttp;
export {
  EMPTY_REQUEST,
  EmptyRequestState,
  LOADING_REQUEST,
  LoadingRequestState,
  FailedRequestState,
  SuccessRequestState,
  RequestState,
} from "lemmy-js-client";

export function wrapClient(client: LemmyHttp) {
  return client;
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
