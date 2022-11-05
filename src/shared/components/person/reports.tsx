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
  ListPrivateMessageReports,
  ListPrivateMessageReportsResponse,
  PostReportResponse,
  PostReportView,
  PrivateMessageReportResponse,
  PrivateMessageReportView,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  amAdmin,
  auth,
  fetchLimit,
  isBrowser,
  setIsoData,
  setupTippy,
  toast,
  updateCommentReportRes,
  updatePostReportRes,
  updatePrivateMessageReportRes,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { CommentReport } from "../comment/comment-report";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { Paginator } from "../common/paginator";
import { PostReport } from "../post/post-report";
import { PrivateMessageReport } from "../private_message/private-message-report";

enum UnreadOrAll {
  Unread,
  All,
}

enum MessageType {
  All,
  CommentReport,
  PostReport,
  PrivateMessageReport,
}

enum MessageEnum {
  CommentReport,
  PostReport,
  PrivateMessageReport,
}

type ItemType = {
  id: number;
  type_: MessageEnum;
  view: CommentReportView | PostReportView | PrivateMessageReportView;
  published: string;
};

interface ReportsState {
  listCommentReportsResponse: Option<ListCommentReportsResponse>;
  listPostReportsResponse: Option<ListPostReportsResponse>;
  listPrivateMessageReportsResponse: Option<ListPrivateMessageReportsResponse>;
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
    ListPostReportsResponse,
    ListPrivateMessageReportsResponse
  );
  private subscription: Subscription;
  private emptyState: ReportsState = {
    listCommentReportsResponse: None,
    listPostReportsResponse: None,
    listPrivateMessageReportsResponse: None,
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
      this.state = {
        ...this.state,
        listCommentReportsResponse: Some(
          this.isoData.routeData[0] as ListCommentReportsResponse
        ),
        listPostReportsResponse: Some(
          this.isoData.routeData[1] as ListPostReportsResponse
        ),
      };
      if (amAdmin()) {
        this.state = {
          ...this.state,
          listPrivateMessageReportsResponse: Some(
            this.isoData.routeData[2] as ListPrivateMessageReportsResponse
          ),
        };
      }
      this.state = {
        ...this.state,
        combined: this.buildCombined(),
        loading: false,
      };
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
    return UserService.Instance.myUserInfo.match({
      some: mui =>
        `@${mui.local_user_view.person.name} ${i18n.t("reports")} - ${
          this.state.siteRes.site_view.site.name
        }`,
      none: "",
    });
  }

  render() {
    return (
      <div className="container-lg">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div className="row">
            <div className="col-12">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={None}
                image={None}
              />
              <h5 className="mb-2">{i18n.t("reports")}</h5>
              {this.selects()}
              {this.state.messageType == MessageType.All && this.all()}
              {this.state.messageType == MessageType.CommentReport &&
                this.commentReports()}
              {this.state.messageType == MessageType.PostReport &&
                this.postReports()}
              {this.state.messageType == MessageType.PrivateMessageReport &&
                this.privateMessageReports()}
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
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
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
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
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
        {amAdmin() && (
          <label
            className={`btn btn-outline-secondary pointer
            ${
              this.state.messageType == MessageType.PrivateMessageReport &&
              "active"
            }
          `}
          >
            <input
              type="radio"
              value={MessageType.PrivateMessageReport}
              checked={
                this.state.messageType == MessageType.PrivateMessageReport
              }
              onChange={linkEvent(this, this.handleMessageTypeChange)}
            />
            {i18n.t("messages")}
          </label>
        )}
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="mr-3">{this.unreadOrAllRadios()}</span>
        <span className="mr-3">{this.messageTypeRadios()}</span>
      </div>
    );
  }

  commentReportToItemType(r: CommentReportView): ItemType {
    return {
      id: r.comment_report.id,
      type_: MessageEnum.CommentReport,
      view: r,
      published: r.comment_report.published,
    };
  }

  postReportToItemType(r: PostReportView): ItemType {
    return {
      id: r.post_report.id,
      type_: MessageEnum.PostReport,
      view: r,
      published: r.post_report.published,
    };
  }

  privateMessageReportToItemType(r: PrivateMessageReportView): ItemType {
    return {
      id: r.private_message_report.id,
      type_: MessageEnum.PrivateMessageReport,
      view: r,
      published: r.private_message_report.published,
    };
  }

  buildCombined(): ItemType[] {
    let comments: ItemType[] = this.state.listCommentReportsResponse
      .map(r => r.comment_reports)
      .unwrapOr([])
      .map(r => this.commentReportToItemType(r));
    let posts: ItemType[] = this.state.listPostReportsResponse
      .map(r => r.post_reports)
      .unwrapOr([])
      .map(r => this.postReportToItemType(r));
    let privateMessages: ItemType[] =
      this.state.listPrivateMessageReportsResponse
        .map(r => r.private_message_reports)
        .unwrapOr([])
        .map(r => this.privateMessageReportToItemType(r));

    return [...comments, ...posts, ...privateMessages].sort((a, b) =>
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
      case MessageEnum.PrivateMessageReport:
        return (
          <PrivateMessageReport
            key={i.id}
            report={i.view as PrivateMessageReportView}
          />
        );
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

  privateMessageReports() {
    return this.state.listPrivateMessageReportsResponse.match({
      some: res => (
        <div>
          {res.private_message_reports.map(pmr => (
            <>
              <hr />
              <PrivateMessageReport
                key={pmr.private_message_report.id}
                report={pmr}
              />
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
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    i.refetch();
  }

  handleMessageTypeChange(i: Reports, event: any) {
    i.setState({ messageType: Number(event.target.value), page: 1 });
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

    if (amAdmin()) {
      let privateMessageReportsForm = new ListPrivateMessageReports({
        unresolved_only,
        page,
        limit,
        auth,
      });
      promises.push(
        req.client.listPrivateMessageReports(privateMessageReportsForm)
      );
    }

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

    if (amAdmin()) {
      let privateMessageReportsForm = new ListPrivateMessageReports({
        unresolved_only,
        page,
        limit,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(
        wsClient.listPrivateMessageReports(privateMessageReportsForm)
      );
    }
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
      this.setState({ listCommentReportsResponse: Some(data) });
      this.setState({ combined: this.buildCombined(), loading: false });
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      setupTippy();
    } else if (op == UserOperation.ListPostReports) {
      let data = wsJsonToRes<ListPostReportsResponse>(
        msg,
        ListPostReportsResponse
      );
      this.setState({ listPostReportsResponse: Some(data) });
      this.setState({ combined: this.buildCombined(), loading: false });
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
      setupTippy();
    } else if (op == UserOperation.ListPrivateMessageReports) {
      let data = wsJsonToRes<ListPrivateMessageReportsResponse>(
        msg,
        ListPrivateMessageReportsResponse
      );
      this.setState({ listPrivateMessageReportsResponse: Some(data) });
      this.setState({ combined: this.buildCombined(), loading: false });
      // this.sendUnreadCount();
      window.scrollTo(0, 0);
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
    } else if (op == UserOperation.ResolvePrivateMessageReport) {
      let data = wsJsonToRes<PrivateMessageReportResponse>(
        msg,
        PrivateMessageReportResponse
      );
      updatePrivateMessageReportRes(
        data.private_message_report_view,
        this.state.listPrivateMessageReportsResponse
          .map(r => r.private_message_reports)
          .unwrapOr([])
      );
      let urcs = UserService.Instance.unreadReportCountSub;
      if (data.private_message_report_view.private_message_report.resolved) {
        urcs.next(urcs.getValue() - 1);
      } else {
        urcs.next(urcs.getValue() + 1);
      }
      this.setState(this.state);
    }
  }
}
