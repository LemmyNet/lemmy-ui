import { GetPostsResponse } from "lemmy-js-client";
import { EMPTY_REQUEST, RequestState } from "./HttpService.js";

/**
 * Service to cache home post listings and restore home state when user uses the browser back buttons.
 */
export class HomeCacheService {
  static #_instance: HomeCacheService;
  historyIdx = 0;
  scrollY = 0;
  posts: RequestState<GetPostsResponse> = EMPTY_REQUEST;

  get active() {
    return (
      this.historyIdx === window.history.state.idx + 1 &&
      this.posts.state === "success"
    );
  }

  deactivate() {
    this.historyIdx = 0;
  }

  activate() {
    this.scrollY = window.scrollY;
    this.historyIdx = window.history.state.idx;
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get scrollY() {
    return this.#Instance.scrollY;
  }

  public static get historyIdx() {
    return this.#Instance.historyIdx;
  }

  public static set postsRes(posts: RequestState<GetPostsResponse>) {
    this.#Instance.posts = posts;
  }

  public static get postsRes() {
    return this.#Instance.posts;
  }

  public static get active() {
    return this.#Instance.active;
  }

  public static deactivate() {
    this.#Instance.deactivate();
  }

  public static activate() {
    this.#Instance.activate();
  }
}
