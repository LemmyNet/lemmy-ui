import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import {
  CommentReportResponse,
  CommentReportView,
  GetSiteResponse,
  ListCommentReports,
  ListCommentReportsResponse,
  ListPostReports,
  ListPostReportsResponse,
  PostReportResponse,
  PostReportView,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  auth,
  fetchLimit,
  isBrowser,
  setIsoData,
  setupTippy,
  toast,
  updateCommentReportRes,
  updatePostReportRes,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { CommentReport } from "../comment/comment-report";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { PostReport } from "../post/post-report";

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
  listCommentReportsResponse: Option<ListCommentReportsResponse>;
  listPostReportsResponse: Option<ListPostReportsResponse>;
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  combined: ItemType[];
  siteRes: GetSiteResponse;
  page: number;
  loading: boolean;
}

export class Reports extends Component<any, ReportsState> {
  private isoData = setIsoData(
    this.context,
    ListCommentReportsResponse,
    ListPostReportsResponse
  );
  private subscription: Subscription;
  private emptyState: ReportsState = {
    listCommentReportsResponse: None,
    listPostReportsResponse: None,
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    combined: [],
    page: 1,
    siteRes: this.isoData.site_res,
    loading: true,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    if (UserService.Instance.myUserInfo.isNone() && isBrowser()) {
      toast(i18n.t("not_logged_in"), "danger");
      this.context.router.history.push(`/login`);
    }

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.listCommentReportsResponse = Some(
        this.isoData.routeData[0] as ListCommentReportsResponse
      );
      this.state.listPostReportsResponse = Some(
        this.isoData.routeData[1] as ListPostReportsResponse
      );
      this.state.combined = this.buildCombined();
      this.state.loading = false;
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
    return this.state.siteRes.site_view.match({
      some: siteView =>
        UserService.Instance.myUserInfo.match({
          some: mui =>
            `@${mui.local_user_view.person.name} ${i18n.t("reports")} - ${
              siteView.site.name
            }`,
          none: "",
        }),
      none: "",
    });
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
                description={None}
                image={None}
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
    let comments: ItemType[] = this.state.listCommentReportsResponse
      .map(r => r.comment_reports)
      .unwrapOr([])
      .map(r => this.replyToReplyType(r));
    let posts: ItemType[] = this.state.listPostReportsResponse
      .map(r => r.post_reports)
      .unwrapOr([])
      .map(r => this.mentionToReplyType(r));

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
    return this.state.listCommentReportsResponse.match({
      some: res => (
        <div>
          {res.comment_reports.map(cr => (
            <>
              <hr />
              <CommentReport key={cr.comment_report.id} report={cr} />
            </>
          ))}
        </div>
      ),
      none: <></>,
    });
  }

  postReports() {
    return this.state.listPostReportsResponse.match({
      some: res => (
        <div>
          {res.post_reports.map(pr => (
            <>
              <hr />
              <PostReport key={pr.post_report.id} report={pr} />
            </>
          ))}
        </div>
      ),
      none: <></>,
    });
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

    let unresolved_only = Some(true);
    let page = Some(1);
    let limit = Some(fetchLimit);
    let community_id = None;
    let auth = req.auth.unwrap();

    let commentReportsForm = new ListCommentReports({
      // TODO community_id
      unresolved_only,
      community_id,
      page,
      limit,
      auth,
    });
    promises.push(req.client.listCommentReports(commentReportsForm));

    let postReportsForm = new ListPostReports({
      // TODO community_id
      unresolved_only,
      community_id,
      page,
      limit,
      auth,
    });
    promises.push(req.client.listPostReports(postReportsForm));

    return promises;
  }

  refetch() {
    let unresolved_only = Some(this.state.unreadOrAll == UnreadOrAll.Unread);
    let community_id = None;
    let page = Some(this.state.page);
    let limit = Some(fetchLimit);

    let commentReportsForm = new ListCommentReports({
      unresolved_only,
      // TODO community_id
      community_id,
      page,
      limit,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(
      wsClient.listCommentReports(commentReportsForm)
    );

    let postReportsForm = new ListPostReports({
      unresolved_only,
      // TODO community_id
      community_id,
      page,
      limit,
      auth: auth().unwrap(),
    });
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
      let data = wsJsonToRes<ListCommentReportsResponse>(
        msg,
        ListCommentReportsResponse
      );
      this.state.listCommentReportsResponse = Some(data);
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.ListPostReports) {
      let data = wsJsonToRes<ListPostReportsResponse>(
        msg,
        ListPostReportsResponse
      );
      this.state.listPostReportsResponse = Some(data);
      this.state.combined = this.buildCombined();
      this.state.loading = false;
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      this.setState(this.state);
      setupTippy();
    } else if (op == UserOperation.ResolvePostReport) {
      let data = wsJsonToRes<PostReportResponse>(msg, PostReportResponse);
      updatePostReportRes(
        data.post_report_view,
        this.state.listPostReportsResponse.map(r => r.post_reports).unwrapOr([])
      );
      let urcs = UserService.Instance.unreadReportCountSub;
      if (data.post_report_view.post_report.resolved) {
        urcs.next(urcs.getValue() - 1);
      } else {
        urcs.next(urcs.getValue() + 1);
      }
      this.setState(this.state);
    } else if (op == UserOperation.ResolveCommentReport) {
      let data = wsJsonToRes<CommentReportResponse>(msg, CommentReportResponse);
      updateCommentReportRes(
        data.comment_report_view,
        this.state.listCommentReportsResponse
          .map(r => r.comment_reports)
          .unwrapOr([])
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
