import { HttpService } from "../services";
import { updateUnreadCountsInterval } from "../config";
import { poll } from "@utils/helpers";
import { myAuth } from "@utils/app";
import { amAdmin } from "@utils/roles";
import { isBrowser } from "@utils/browser";
import { BehaviorSubject } from "rxjs";

/**
 * Service to poll and keep track of unread messages / notifications.
 */
export class UnreadCounterService {
  // fetched by HttpService.getUnreadCount, appear in inbox
  unreadPrivateMessages = 0;
  unreadReplies = 0;
  unreadMentions = 0;
  public unreadInboxCountSubject: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  // fetched by HttpService.getReportCount, appear in report page
  commentReportCount = 0;
  postReportCount = 0;
  messageReportCount = 0;
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
        this.unreadPrivateMessages = unreadCountRes.data.private_messages;
        this.unreadReplies = unreadCountRes.data.replies;
        this.unreadMentions = unreadCountRes.data.mentions;
        this.unreadInboxCountSubject.next(
          this.unreadPrivateMessages + this.unreadReplies + this.unreadMentions,
        );
      }
    }
  }

  public async updateReports() {
    if (this.shouldUpdate && UserService.Instance.moderatesSomething) {
      const reportCountRes = await HttpService.client.getReportCount({});
      if (reportCountRes.state === "success") {
        this.commentReportCount = reportCountRes.data.comment_reports ?? 0;
        this.postReportCount = reportCountRes.data.post_reports ?? 0;
        this.messageReportCount =
          reportCountRes.data.private_message_reports ?? 0;
        this.unreadReportCountSubject.next(
          this.commentReportCount +
            this.postReportCount +
            this.messageReportCount,
        );
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
