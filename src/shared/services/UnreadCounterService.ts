import { HttpService } from "@services/index";
import { updateUnreadCountsInterval } from "@utils/config";
import { poll } from "@utils/helpers";
import { myAuth } from "@utils/app";
import { amAdmin, moderatesSomething } from "@utils/roles";
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

  private enableInboxCounts: boolean = false;
  private enableReports: boolean = false;
  private enableApplications: boolean = false;
  private polling: boolean = false;

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
    this.enableInboxCounts = !!myUserInfo;
    this.enableReports = moderatesSomething(myUserInfo);
    this.enableApplications = amAdmin(myUserInfo);
    if (!this.polling) {
      this.polling = true;
      poll(async () => this.updateAll(), updateUnreadCountsInterval);
    }
  }

  public async updateInboxCounts() {
    if (this.shouldUpdate && this.enableInboxCounts) {
      const unreadCountRes = await HttpService.client.getUnreadCount();
      if (unreadCountRes.state === "success") {
        this.unreadInboxCountSubject.next(unreadCountRes.data.count);
      }
    }
  }

  public async updateReports() {
    if (this.shouldUpdate && this.enableReports) {
      const reportCountRes = await HttpService.client.getReportCount({});
      if (reportCountRes.state === "success") {
        this.unreadReportCountSubject.next(reportCountRes.data.count);
      }
    }
  }

  public async updateApplications() {
    if (this.shouldUpdate && this.enableApplications) {
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
