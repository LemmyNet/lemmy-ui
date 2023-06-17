import { createBrowserHistory, History } from "history";

export class HistoryService {
  static #_instance: HistoryService;
  #history: History;

  private constructor() {
    this.#history = createBrowserHistory();
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  public static get history() {
    return this.#Instance.#history;
  }
}
