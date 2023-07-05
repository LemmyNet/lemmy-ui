import { myAuth } from "@utils/app";
import { isBrowser } from "@utils/browser";
import { poll } from "@utils/helpers";
import { amAdmin } from "@utils/roles";
import {
  GetReportCountResponse,
  GetUnreadCountResponse,
  GetUnreadRegistrationApplicationCountResponse,
} from "lemmy-js-client";
import { Observable, Subscriber } from "rxjs";
import { updateUnreadCountsInterval } from "../config";
import { HttpService, UserService } from "../services";
import { RequestState } from "../services/HttpService";

export class InboxService {
  static #_instance: InboxService;
  unreadInboxCountRes: RequestState<GetUnreadCountResponse>;
  unreadReportCountRes: RequestState<GetReportCountResponse>;
  unreadApplicationCountRes: RequestState<GetUnreadRegistrationApplicationCountResponse>;

  observable: Observable<unknown>;
  subscriber: Subscriber<unknown> | null;

  private constructor() {
    this.unreadInboxCountRes = { state: "empty" };
    this.unreadReportCountRes = { state: "empty" };
    this.unreadApplicationCountRes = { state: "empty" };

    this.observable = new Observable(s => {
      this.subscriber = s;
    });

    this.subscriber = null;

    this.startPoll();
    this.fetchUnreadCounts();
  }

  static get #Instance() {
    return this.#_instance ?? (this.#_instance = new this());
  }

  unreadInboxCount(): number {
    if (this.unreadInboxCountRes.state === "success") {
      const { data } = this.unreadInboxCountRes;
      return data.replies + data.mentions + data.private_messages;
    } else {
      return 0;
    }
  }

  public static get unreadInboxCount(): number {
    return this.#Instance.unreadInboxCount();
  }

  unreadReportCount(): number {
    if (this.unreadReportCountRes.state === "success") {
      const { data } = this.unreadReportCountRes;
      return (
        data.post_reports +
        data.comment_reports +
        (data.private_message_reports ?? 0)
      );
    } else {
      return 0;
    }
  }

  public static get unreadReportCount(): number {
    return this.#Instance.unreadReportCount();
  }

  unreadApplicationCount(): number {
    if (this.unreadApplicationCountRes.state === "success") {
      return this.unreadApplicationCountRes.data.registration_applications;
    } else {
      return 0;
    }
  }

  public static get unreadApplicationCount(): number {
    return this.#Instance.unreadApplicationCount();
  }

  public static get observable(): Observable<unknown> {
    return this.#Instance.observable;
  }

  get isModerator(): boolean {
    const mods = UserService.Instance.myUserInfo?.moderates;
    const moderates = (mods && mods.length > 0) || false;
    return amAdmin() || moderates;
  }

  startPoll() {
    if (!isBrowser()) {
      return;
    }

    poll(async () => {
      if (window.document.visibilityState === "hidden") {
        return;
      }

      this.fetchUnreadCounts();
    }, updateUnreadCountsInterval);
  }

  async fetchUnreadCounts() {
    const auth = myAuth();

    if (auth) {
      this.unreadInboxCountRes = await HttpService.client.getUnreadCount({
        auth,
      });

      if (this.isModerator) {
        this.unreadReportCountRes = await HttpService.client.getReportCount({
          auth,
        });
      }

      if (amAdmin()) {
        this.unreadApplicationCountRes =
          await HttpService.client.getUnreadRegistrationApplicationCount({
            auth,
          });
      }
    }

    this.subscriber?.next();
  }

  public static fetchUnreadCounts() {
    this.#Instance.fetchUnreadCounts();
  }
}
