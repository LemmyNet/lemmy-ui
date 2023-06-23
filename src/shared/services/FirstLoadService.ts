import { isBrowser } from "@utils/browser";

export class FirstLoadService {
  #isFirstLoad: boolean;
  static #instance: FirstLoadService;

  private constructor() {
    this.#isFirstLoad = true;
  }

  get isFirstLoad() {
    const isFirst = this.#isFirstLoad;
    if (isFirst) {
      this.#isFirstLoad = false;
    }

    return isFirst;
  }

  static get #Instance() {
    return this.#instance ?? (this.#instance = new this());
  }

  static get isFirstLoad() {
    return !isBrowser() || this.#Instance.isFirstLoad;
  }
}
