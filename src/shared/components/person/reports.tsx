import { Component, linkEvent } from "inferno";
import {
  CommentReportResponse,
  CommentReportView,
  ListCommentReports,
  ListCommentReportsResponse,
  ListPostReports,
  ListPostReportsResponse,
  PostReportResponse,
  PostReportView,
  SiteView,
  UserOperation,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  fetchLimit,
  isBrowser,
  setIsoData,
  setupTippy,
  toast,
  updateCommentReportRes,
  updatePostReportRes,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
} from "../../utils";
import { CommentReport } from "../comment/comment_report";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { PostReport } from "../post/post_report";

enum UnreadOrAll {
  Unread,
  All,
}

enum MessageType {
  All,
  CommentReport,
  PostReport,
}

enum MessageEnum {
  CommentReport,
  PostReport,
}

type ItemType = {
  id: number;
  type_: MessageEnum;
  view: CommentReportView | PostReportView;
  published: string;
};

interface ReportsState {
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  commentReports: CommentReportView[];
  postReports: PostReportView[];
  combined: ItemType[];
  page: number;
  site_view: SiteView;
  loading: boolean;
}

export class Reports extends Component<any, ReportsState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: ReportsState = {
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    commentReports: [],
    postReports: [],
    combined: [],
    page: 1,
    site_view: this.isoData.site_res.site_view,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    if (!UserService.Instance.myUserInfo && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.commentReports =
        this.isoData.routeData[0].comment_reports || [];
      this.state.postReports = this.isoData.routeData[1].post_reports || [];
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      console.log(this.isoData.routeData[1]);
    } else {
      this.refetch();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  get documentTitle(): string {
    return `@${
      UserService.Instance.myUserInfo.local_user_view.person.name
    } ${i18n.t("reports")} - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
              />
              <h5 class="mb-2">{i18n.t("reports")}</h5>
              {this.selects()}
              {this.state.messageType == MessageType.All && this.all()}
              {this.state.messageType == MessageType.CommentReport &&
                this.commentReports()}
              {this.state.messageType == MessageType.PostReport &&
                this.postReports()}
              <Paginator
                page={this.state.page}
                onChange={this.handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  unreadOrAllRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.Unread && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("unread")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && "active"}
          `}
        >
          <input
            type="radio"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {i18n.t("all")}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.All && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.All}
            checked={this.state.messageType == MessageType.All}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("all")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.CommentReport && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.CommentReport}
            checked={this.state.messageType == MessageType.CommentReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.PostReport && "active"}
          `}
        >
          <input
            type="radio"
            value={MessageType.PostReport}
            checked={this.state.messageType == MessageType.PostReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {i18n.t("posts")}
        </label>
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span class="mr-3">{this.unreadOrAllRadios()}</span>
        <span class="mr-3">{this.messageTypeRadios()}</span>
      </div>
    );
  }

  replyToReplyType(r: CommentReportView): ItemType {
    return {
      id: r.comment_report.id,
      type_: MessageEnum.CommentReport,
      view: r,
      published: r.comment_report.published,
    };
  }

  mentionToReplyType(r: PostReportView): ItemType {
    return {
      id: r.post_report.id,
      type_: MessageEnum.PostReport,
      view: r,
      published: r.post_report.published,
    };
  }

  buildCombined(): ItemType[] {
    let comments: ItemType[] = this.state.commentReports.map(r =>
      this.replyToReplyType(r)
    );
    let posts: ItemType[] = this.state.postReports.map(r =>
      this.mentionToReplyType(r)
    );

    return [...comments, ...posts].sort((a, b) =>
      b.published.localeCompare(a.published)
    );
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case MessageEnum.CommentReport:
        return (
          <CommentReport key={i.id} report={i.view as CommentReportView} />
        );
      case MessageEnum.PostReport:
        return <PostReport key={i.id} report={i.view as PostReportView} />;
      default:
        return <div />;
    }
  }

  all() {
    return (
      <div>
        {this.state.combined.map(i => (
          <>
            <hr />
            {this.renderItemType(i)}
          </>
        ))}
      </div>
    );
  }

  commentReports() {
    return (
      <div>
        {this.state.commentReports.map(cr => (
          <>
            <hr />
            <CommentReport key={cr.comment_report.id} report={cr} />
          </>
        ))}
      </div>
    );
  }

  postReports() {
    return (
      <div>
        {this.state.postReports.map(pr => (
          <>
            <hr />
            <PostReport key={pr.post_report.id} report={pr} />
          </>
        ))}
      </div>
    );
  }

  handlePageChange(page: number) {
    this.setState({ page });
    this.refetch();
  }

  handleUnreadOrAllChange(i: Reports, event: any) {
    i.state.unreadOrAll = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  handleMessageTypeChange(i: Reports, event: any) {
    i.state.messageType = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let promises: Promise<any>[] = [];

    let commentReportsForm: ListCommentReports = {
      // TODO community_id
      unresolved_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.listCommentReports(commentReportsForm));

    let postReportsForm: ListPostReports = {
      // TODO community_id
      unresolved_only: true,
      page: 1,
      limit: fetchLimit,
      auth: req.auth,
    };
    promises.push(req.client.listPostReports(postReportsForm));

    return promises;
  }

  refetch() {
    let unresolved_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    let commentReportsForm: ListCommentReports = {
      // TODO community_id
      unresolved_only,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
    WebSocketService.Instance.send(
      wsClient.listCommentReports(commentReportsForm)
    );

    let postReportsForm: ListPostReports = {
      // TODO community_id
      unresolved_only,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.listPostReports(postReportsForm));
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (msg.reconnect) {
      this.refetch();
    } else if (op == UserOperation.ListCommentReports) {
      let data = wsJsonToRes<ListCommentReportsResponse>(msg).data;
      this.state.commentReports = data.comment_reports;
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.ListPostReports) {
      let data = wsJsonToRes<ListPostReportsResponse>(msg).data;
      this.state.postReports = data.post_reports;
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.ResolvePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg).data;
      updatePostReportRes(data.post_report_view, this.state.postReports);
      let urcs = UserService.Instance.unreadReportCountSub;
      if (data.post_report_view.post_report.resolved) {
        urcs.next(urcs.getValue() - 1);
      } else {
        urcs.next(urcs.getValue() + 1);
      }
      this.setState(this.state);
    } else if (op == UserOperation.ResolveCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg).data;
      updateCommentReportRes(
        data.comment_report_view,
        this.state.commentReports
      );
      let urcs = UserService.Instance.unreadReportCountSub;
      if (data.comment_report_view.comment_report.resolved) {
        urcs.next(urcs.getValue() - 1);
      } else {
        urcs.next(urcs.getValue() + 1);
      }
      this.setState(this.state);
    }
  }
}
