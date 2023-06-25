import {
  editCommentReport,
  editPostReport,
  editPrivateMessageReport,
  myAuthRequired,
  setIsoData,
} from "@utils/app";
import { amAdmin } from "@utils/roles";
import { RouteDataResponse } from "@utils/types";
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
  ResolveCommentReport,
  ResolvePostReport,
  ResolvePrivateMessageReport,
} from "lemmy-js-client";
import { fetchLimit } from "../../config";
import { InitialFetchRequest } from "../../interfaces";
import {
  FirstLoadService,
  HttpService,
  I18NextService,
  UserService,
} from "../../services";
import { RequestState } from "../../services/HttpService";
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

type ReportsData = RouteDataResponse<{
  commentReportsRes: ListCommentReportsResponse;
  postReportsRes: ListPostReportsResponse;
  messageReportsRes: ListPrivateMessageReportsResponse;
}>;

type ItemType = {
  id: number;
  type_: MessageEnum;
  view: CommentReportView | PostReportView | PrivateMessageReportView;
  published: string;
};

interface ReportsState {
  commentReportsRes: RequestState<ListCommentReportsResponse>;
  postReportsRes: RequestState<ListPostReportsResponse>;
  messageReportsRes: RequestState<ListPrivateMessageReportsResponse>;
  unreadOrAll: UnreadOrAll;
  messageType: MessageType;
  siteRes: GetSiteResponse;
  page: number;
  isIsomorphic: boolean;
}

export class Reports extends Component<any, ReportsState> {
  private isoData = setIsoData<ReportsData>(this.context);
  state: ReportsState = {
    commentReportsRes: { state: "empty" },
    postReportsRes: { state: "empty" },
    messageReportsRes: { state: "empty" },
    unreadOrAll: UnreadOrAll.Unread,
    messageType: MessageType.All,
    page: 1,
    siteRes: this.isoData.site_res,
    isIsomorphic: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleResolveCommentReport =
      this.handleResolveCommentReport.bind(this);
    this.handleResolvePostReport = this.handleResolvePostReport.bind(this);
    this.handleResolvePrivateMessageReport =
      this.handleResolvePrivateMessageReport.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { commentReportsRes, postReportsRes, messageReportsRes } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        commentReportsRes,
        postReportsRes,
        isIsomorphic: true,
      };

      if (amAdmin()) {
        this.state = {
          ...this.state,
          messageReportsRes: messageReportsRes,
        };
      }
    }
  }

  async componentDidMount() {
    if (!this.state.isIsomorphic) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    const mui = UserService.Instance.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${I18NextService.i18n.t(
          "reports"
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    return (
      <main className="person-reports container-lg row mx-1 mx-md-auto">
        <div className="col-12">
          <HtmlTags
            title={this.documentTitle}
            path={this.context.router.route.match.url}
          />
          <h5 className="mb-2">{I18NextService.i18n.t("reports")}</h5>
          {this.selects()}
          {this.section}
          <Paginator page={this.state.page} onChange={this.handlePageChange} />
        </div>
      </main>
    );
  }

  get section() {
    switch (this.state.messageType) {
      case MessageType.All: {
        return this.all();
      }
      case MessageType.CommentReport: {
        return this.commentReports();
      }
      case MessageType.PostReport: {
        return this.postReports();
      }
      case MessageType.PrivateMessageReport: {
        return this.privateMessageReports();
      }

      default: {
        return null;
      }
    }
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
            className="btn-check"
            value={UnreadOrAll.Unread}
            checked={this.state.unreadOrAll == UnreadOrAll.Unread}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {I18NextService.i18n.t("unread")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.unreadOrAll == UnreadOrAll.All && "active"}
          `}
        >
          <input
            type="radio"
            className="btn-check"
            value={UnreadOrAll.All}
            checked={this.state.unreadOrAll == UnreadOrAll.All}
            onChange={linkEvent(this, this.handleUnreadOrAllChange)}
          />
          {I18NextService.i18n.t("all")}
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
            className="btn-check"
            value={MessageType.All}
            checked={this.state.messageType == MessageType.All}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {I18NextService.i18n.t("all")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.CommentReport && "active"}
          `}
        >
          <input
            type="radio"
            className="btn-check"
            value={MessageType.CommentReport}
            checked={this.state.messageType == MessageType.CommentReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {I18NextService.i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.messageType == MessageType.PostReport && "active"}
          `}
        >
          <input
            type="radio"
            className="btn-check"
            value={MessageType.PostReport}
            checked={this.state.messageType == MessageType.PostReport}
            onChange={linkEvent(this, this.handleMessageTypeChange)}
          />
          {I18NextService.i18n.t("posts")}
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
              className="btn-check"
              value={MessageType.PrivateMessageReport}
              checked={
                this.state.messageType == MessageType.PrivateMessageReport
              }
              onChange={linkEvent(this, this.handleMessageTypeChange)}
            />
            {I18NextService.i18n.t("messages")}
          </label>
        )}
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="me-3">{this.unreadOrAllRadios()}</span>
        <span className="me-3">{this.messageTypeRadios()}</span>
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

  get buildCombined(): ItemType[] {
    const commentRes = this.state.commentReportsRes;
    const comments =
      commentRes.state == "success"
        ? commentRes.data.comment_reports.map(this.commentReportToItemType)
        : [];

    const postRes = this.state.postReportsRes;
    const posts =
      postRes.state == "success"
        ? postRes.data.post_reports.map(this.postReportToItemType)
        : [];
    const pmRes = this.state.messageReportsRes;
    const privateMessages =
      pmRes.state == "success"
        ? pmRes.data.private_message_reports.map(
            this.privateMessageReportToItemType
          )
        : [];

    return [...comments, ...posts, ...privateMessages].sort((a, b) =>
      b.published.localeCompare(a.published)
    );
  }

  renderItemType(i: ItemType) {
    switch (i.type_) {
      case MessageEnum.CommentReport:
        return (
          <CommentReport
            key={i.id}
            report={i.view as CommentReportView}
            onResolveReport={this.handleResolveCommentReport}
          />
        );
      case MessageEnum.PostReport:
        return (
          <PostReport
            key={i.id}
            report={i.view as PostReportView}
            onResolveReport={this.handleResolvePostReport}
          />
        );
      case MessageEnum.PrivateMessageReport:
        return (
          <PrivateMessageReport
            key={i.id}
            report={i.view as PrivateMessageReportView}
            onResolveReport={this.handleResolvePrivateMessageReport}
          />
        );
      default:
        return <div />;
    }
  }

  all() {
    return (
      <>
        {this.buildCombined.map(i => (
          <>
            <hr />
            {this.renderItemType(i)}
          </>
        ))}
      </>
    );
  }

  commentReports() {
    const res = this.state.commentReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.comment_reports;
        return (
          <>
            {reports.map(cr => (
              <>
                <hr />
                <CommentReport
                  key={cr.comment_report.id}
                  report={cr}
                  onResolveReport={this.handleResolveCommentReport}
                />
              </>
            ))}
          </>
        );
      }
    }
  }

  postReports() {
    const res = this.state.postReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.post_reports;
        return (
          <>
            {reports.map(pr => (
              <>
                <hr />
                <PostReport
                  key={pr.post_report.id}
                  report={pr}
                  onResolveReport={this.handleResolvePostReport}
                />
              </>
            ))}
          </>
        );
      }
    }
  }

  privateMessageReports() {
    const res = this.state.messageReportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.private_message_reports;
        return (
          <>
            {reports.map(pmr => (
              <>
                <hr />
                <PrivateMessageReport
                  key={pmr.private_message_report.id}
                  report={pmr}
                  onResolveReport={this.handleResolvePrivateMessageReport}
                />
              </>
            ))}
          </>
        );
      }
    }
  }

  async handlePageChange(page: number) {
    this.setState({ page });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Reports, event: any) {
    i.setState({ unreadOrAll: Number(event.target.value), page: 1 });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Reports, event: any) {
    i.setState({ messageType: Number(event.target.value), page: 1 });
    await i.refetch();
  }

  static async fetchInitialData({
    auth,
    client,
  }: InitialFetchRequest): Promise<ReportsData> {
    const unresolved_only = true;
    const page = 1;
    const limit = fetchLimit;

    const commentReportsForm: ListCommentReports = {
      unresolved_only,
      page,
      limit,
      auth: auth as string,
    };

    const postReportsForm: ListPostReports = {
      unresolved_only,
      page,
      limit,
      auth: auth as string,
    };

    const data: ReportsData = {
      commentReportsRes: await client.listCommentReports(commentReportsForm),
      postReportsRes: await client.listPostReports(postReportsForm),
      messageReportsRes: { state: "empty" },
    };

    if (amAdmin()) {
      const privateMessageReportsForm: ListPrivateMessageReports = {
        unresolved_only,
        page,
        limit,
        auth: auth as string,
      };

      data.messageReportsRes = await client.listPrivateMessageReports(
        privateMessageReportsForm
      );
    }

    return data;
  }

  async refetch() {
    const unresolved_only = this.state.unreadOrAll == UnreadOrAll.Unread;
    const page = this.state.page;
    const limit = fetchLimit;
    const auth = myAuthRequired();

    this.setState({
      commentReportsRes: { state: "loading" },
      postReportsRes: { state: "loading" },
      messageReportsRes: { state: "loading" },
    });

    const form:
      | ListCommentReports
      | ListPostReports
      | ListPrivateMessageReports = {
      unresolved_only,
      page,
      limit,
      auth,
    };

    this.setState({
      commentReportsRes: await HttpService.client.listCommentReports(form),
      postReportsRes: await HttpService.client.listPostReports(form),
    });

    if (amAdmin()) {
      this.setState({
        messageReportsRes: await HttpService.client.listPrivateMessageReports(
          form
        ),
      });
    }
  }

  async handleResolveCommentReport(form: ResolveCommentReport) {
    const res = await HttpService.client.resolveCommentReport(form);
    this.findAndUpdateCommentReport(res);
  }

  async handleResolvePostReport(form: ResolvePostReport) {
    const res = await HttpService.client.resolvePostReport(form);
    this.findAndUpdatePostReport(res);
  }

  async handleResolvePrivateMessageReport(form: ResolvePrivateMessageReport) {
    const res = await HttpService.client.resolvePrivateMessageReport(form);
    this.findAndUpdatePrivateMessageReport(res);
  }

  findAndUpdateCommentReport(res: RequestState<CommentReportResponse>) {
    this.setState(s => {
      if (s.commentReportsRes.state == "success" && res.state == "success") {
        s.commentReportsRes.data.comment_reports = editCommentReport(
          res.data.comment_report_view,
          s.commentReportsRes.data.comment_reports
        );
      }
      return s;
    });
  }

  findAndUpdatePostReport(res: RequestState<PostReportResponse>) {
    this.setState(s => {
      if (s.postReportsRes.state == "success" && res.state == "success") {
        s.postReportsRes.data.post_reports = editPostReport(
          res.data.post_report_view,
          s.postReportsRes.data.post_reports
        );
      }
      return s;
    });
  }

  findAndUpdatePrivateMessageReport(
    res: RequestState<PrivateMessageReportResponse>
  ) {
    this.setState(s => {
      if (s.messageReportsRes.state == "success" && res.state == "success") {
        s.messageReportsRes.data.private_message_reports =
          editPrivateMessageReport(
            res.data.private_message_report_view,
            s.messageReportsRes.data.private_message_reports
          );
      }
      return s;
    });
  }
}
