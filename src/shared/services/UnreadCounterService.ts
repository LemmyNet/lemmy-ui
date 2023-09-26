import { UserService, HttpService } from "../services";
import { updateUnreadCountsInterval } from "../config";
import { poll } from "@utils/helpers";
import { myAuth } from "@utils/app";
import { amAdmin } from "@utils/roles";
import { isBrowser } from "@utils/browser";

/**
 * Service to poll and keep track of unread messages / notifications.
 */
export class UnreadCounterService {
  // fetched by HttpService.getUnreadCount, appear in inbox
  unreadPrivateMessages = 0;
  unreadReplies = 0;
  unreadMentions = 0;
  public unreadInboxCount = 0;

  // fetched by HttpService.getReportCount, appear in report page
  commentReportCount = 0;
  postReportCount = 0;
  messageReportCount = 0;
  public unreadReportCount = 0;

  // fetched by HttpService.getUnreadRegistrationApplicationCount, appear in registration application page
  public unreadApplicationCount = 0;

  static #instance: UnreadCounterService;
  private subscriptions = new Set<(service: UnreadCounterService) => any>();
  private fetching = false;

  constructor() {
    if (isBrowser()) {
      poll(this.update, updateUnreadCountsInterval);
    }
  }

  public update = async () => {
    if (window.document.visibilityState === "hidden") {
      return;
    }
    const auth = myAuth();
    if (!auth) {
      return;
    }
    this.fetching = true;
    const unreadCountRes = await HttpService.client.getUnreadCount();
    if (unreadCountRes.state === "success") {
      this.unreadPrivateMessages = unreadCountRes.data.private_messages;
      this.unreadReplies = unreadCountRes.data.replies;
      this.unreadMentions = unreadCountRes.data.mentions;
      this.unreadInboxCount =
        this.unreadPrivateMessages + this.unreadReplies + this.unreadMentions;
    }
    if (UserService.Instance.moderatesSomething) {
      const reportCountRes = await HttpService.client.getReportCount({});
      if (reportCountRes.state === "success") {
        this.commentReportCount = reportCountRes.data.comment_reports ?? 0;
        this.postReportCount = reportCountRes.data.post_reports ?? 0;
        this.messageReportCount =
          reportCountRes.data.private_message_reports ?? 0;
        this.unreadReportCount =
          this.commentReportCount +
          this.postReportCount +
          this.messageReportCount;
      }
    }
    if (amAdmin()) {
      const unreadApplicationsRes =
        await HttpService.client.getUnreadRegistrationApplicationCount();
      if (unreadApplicationsRes.state === "success") {
        this.unreadApplicationCount =
          unreadApplicationsRes.data.registration_applications;
      }
    }
    this.fetching = false;
    this.subscriptions.forEach(action => action(this));
  };

  subscribe(action: (service: UnreadCounterService) => any) {
    this.subscriptions.add(action);
    if (!this.fetching) {
      this.update();
    }
  }

  unsubscribe(action: (service: UnreadCounterService) => any) {
    this.subscriptions.delete(action);
  }

  static get Instance() {
    return this.#instance ?? (this.#instance = new this());
  }
}
