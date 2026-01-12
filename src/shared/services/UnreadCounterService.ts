import { HttpService } from "@services/index";
import { updateUnreadCountsInterval } from "@utils/config";
import { poll } from "@utils/helpers";
import { myAuth } from "@utils/app";
import { BehaviorSubject } from "rxjs";
import { MyUserInfo } from "lemmy-js-client";

/**
 * Service to poll and keep track of unread notifications count which is shown in the navbar.
 */
export class UnreadCounterService {
  public notificationCount: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  public unreadReportCount: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  public unreadApplicationCount: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  public pendingFollowCount: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  private enableUnreadCounts: boolean = false;

  static #instance: UnreadCounterService;

  private get shouldUpdate() {
    if (window.document.visibilityState === "hidden") {
      return false;
    }
    if (!myAuth()) {
      return false;
    }
    return true;
  }

  public configure(myUserInfo: MyUserInfo | undefined) {
    this.enableUnreadCounts = !!myUserInfo;
    poll(async () => this.updateUnreadCounts(), updateUnreadCountsInterval);
  }

  public async updateUnreadCounts() {
    if (this.shouldUpdate && this.enableUnreadCounts) {
      const unreadCountRes = await HttpService.client.getUnreadCounts();
      if (unreadCountRes.state === "success") {
        const data = unreadCountRes.data;
        this.notificationCount.next(data.notification_count);
        if (data.report_count) {
          this.unreadReportCount.next(data.report_count);
        }
        if (data.pending_follow_count) {
          this.pendingFollowCount.next(data.pending_follow_count);
        }
        if (data.registration_application_count) {
          this.unreadApplicationCount.next(data.registration_application_count);
        }
      }
    }
  }

  static get Instance() {
    return this.#instance ?? (this.#instance = new this());
  }
}
