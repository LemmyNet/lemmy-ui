import { HttpService } from "@services/index";
import { updateUnreadCountsInterval } from "@utils/config";
import { poll } from "@utils/helpers";
import { myAuth } from "@utils/app";
import { amAdmin, moderatesSomething } from "@utils/roles";
import { isBrowser } from "@utils/browser";
import { BehaviorSubject } from "rxjs";
import { MyUserInfo } from "lemmy-js-client";

/**
 * Service to poll and keep track of unread messages / notifications.
 */
export class UnreadCounterService {
  // fetched by HttpService.getUnreadCount, appear in inbox
  public unreadInboxCountSubject: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  // fetched by HttpService.getReportCount, appear in report page
  public unreadReportCountSubject: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  // fetched by HttpService.getUnreadRegistrationApplicationCount, appear in registration application page
  public unreadApplicationCountSubject: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  static #instance: UnreadCounterService;

  constructor() {
    if (isBrowser()) {
      poll(async () => this.updateAll(), updateUnreadCountsInterval);
    }
  }

  private get shouldUpdate() {
    if (window.document.visibilityState === "hidden") {
      return false;
    }
    if (!myAuth()) {
      return false;
    }
    return true;
  }

  public async updateInboxCounts() {
    if (this.shouldUpdate) {
      const unreadCountRes = await HttpService.client.getUnreadCount();
      if (unreadCountRes.state === "success") {
        this.unreadInboxCountSubject.next(unreadCountRes.data.count);
      }
    }
  }

  public async updateReports(myUserInfo?: MyUserInfo) {
    if (this.shouldUpdate && moderatesSomething(myUserInfo)) {
      const reportCountRes = await HttpService.client.getReportCount({});
      if (reportCountRes.state === "success") {
        this.unreadReportCountSubject.next(reportCountRes.data.count);
      }
    }
  }

  public async updateApplications() {
    if (this.shouldUpdate && amAdmin()) {
      const unreadApplicationsRes =
        await HttpService.client.getUnreadRegistrationApplicationCount();
      if (unreadApplicationsRes.state === "success") {
        this.unreadApplicationCountSubject.next(
          unreadApplicationsRes.data.registration_applications,
        );
      }
    }
  }

  public async updateAll() {
    this.updateInboxCounts();
    this.updateReports();
    this.updateApplications();
  }

  static get Instance() {
    return this.#instance ?? (this.#instance = new this());
  }
}
