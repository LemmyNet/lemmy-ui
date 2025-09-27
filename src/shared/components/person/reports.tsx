import {
  editCombined,
  enableNsfw,
  getUncombinedReport,
  setIsoData,
  toast,
} from "@utils/app";
import { cursorComponents, randomStr, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { amAdmin } from "@utils/roles";
import { DirectionalCursor, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, InfernoNode, linkEvent } from "inferno";
import {
  CommentReportResponse,
  GetSiteResponse,
  LemmyHttp,
  ListReports,
  ListReportsResponse,
  PostReportResponse,
  PrivateMessageReportResponse,
  ReportCombinedView,
  ResolveCommentReport,
  ResolvePostReport,
  ResolvePrivateMessageReport,
  PaginationCursor,
  ResolveCommunityReport,
  CommunityReportResponse,
  ReportType,
  RemovePost,
  RemoveComment,
  Person,
  Community,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, HttpService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { CommentReport } from "../comment/comment-report";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { PostReport } from "../post/post-report";
import { PrivateMessageReport } from "../private_message/private-message-report";
import { UnreadCounterService } from "../../services";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { PaginatorCursor } from "../common/paginator-cursor";
import { CommunityReport } from "../community/community-report";
import ModActionFormModal, {
  BanUpdateForm,
} from "@components/common/modal/mod-action-form-modal";
import { futureDaysToUnixTime } from "@utils/date";

enum UnreadOrAll {
  Unread,
  All,
}

type ReportsData = RouteDataResponse<{
  reportsRes: ListReportsResponse;
}>;

interface ReportsState {
  reportsRes: RequestState<ListReportsResponse>;
  unreadOrAll: UnreadOrAll;
  messageType: ReportType;
  siteRes: GetSiteResponse;
  cursor?: DirectionalCursor;
  isIsomorphic: boolean;
  banFromCommunityForm?: BanFromCommunityData;
  adminBanForm?: BanFromSiteData;
  showCommunityRuleViolations: boolean;
}

type ReportsRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type ReportsFetchConfig = IRoutePropsWithFetch<
  ReportsData,
  Record<string, never>,
  Record<string, never>
>;

// These are needed because ModActionFormModal requires full Person/Community, but the api forms
// (BanFromCommunity) only contain PersonId/CommunityId.
export interface BanFromCommunityData {
  person: Person;
  community: Community;
  ban: boolean;
}

export interface BanFromSiteData {
  person: Person;
  ban: boolean;
}

@scrollMixin
export class Reports extends Component<ReportsRouteProps, ReportsState> {
  private isoData = setIsoData<ReportsData>(this.context);
  state: ReportsState = {
    reportsRes: EMPTY_REQUEST,
    unreadOrAll: UnreadOrAll.Unread,
    messageType: "All",
    siteRes: this.isoData.siteRes,
    isIsomorphic: false,
    showCommunityRuleViolations: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.reportsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleResolveCommentReport =
      this.handleResolveCommentReport.bind(this);
    this.handleResolvePostReport = this.handleResolvePostReport.bind(this);
    this.handleResolvePrivateMessageReport =
      this.handleResolvePrivateMessageReport.bind(this);
    this.handleResolveCommunityReport =
      this.handleResolveCommunityReport.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleAdminBan = this.handleAdminBan.bind(this);
    this.handleModBanFromCommunity = this.handleModBanFromCommunity.bind(this);
    this.handleSubmitBanFromCommunity =
      this.handleSubmitBanFromCommunity.bind(this);
    this.handleSubmitAdminBan = this.handleSubmitAdminBan.bind(this);
    this.handleCloseModActionModals =
      this.handleCloseModActionModals.bind(this);
    this.handleClickshowCommunityReports =
      this.handleClickshowCommunityReports.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { reportsRes } = this.isoData.routeData;

      this.state = {
        ...this.state,
        reportsRes,
        isIsomorphic: true,
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.refetch();
    }
  }

  get documentTitle(): string {
    const mui = this.isoData.myUserInfo;
    return mui
      ? `@${mui.local_user_view.person.name} ${I18NextService.i18n.t(
          "reports",
        )} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  get nextPageCursor(): PaginationCursor | undefined {
    const { reportsRes: res } = this.state;
    return res.state === "success" ? res.data.next_page : undefined;
  }

  render() {
    const banFromCommunityForm = this.state.banFromCommunityForm;
    const adminBanForm = this.state.adminBanForm;
    return (
      <div className="person-reports container-lg">
        {banFromCommunityForm && (
          <ModActionFormModal
            onSubmit={this.handleSubmitBanFromCommunity}
            modActionType="community-ban"
            creator={banFromCommunityForm.person}
            community={banFromCommunityForm.community}
            isBanned={!banFromCommunityForm.ban}
            onCancel={this.handleCloseModActionModals}
            show={true}
          />
        )}
        {adminBanForm && (
          <ModActionFormModal
            onSubmit={this.handleSubmitAdminBan}
            modActionType="site-ban"
            creator={adminBanForm.person}
            isBanned={!adminBanForm.ban}
            onCancel={this.handleCloseModActionModals}
            show={true}
          />
        )}
        <div className="row">
          <div className="col-12">
            <HtmlTags
              title={this.documentTitle}
              path={this.context.router.route.match.url}
            />
            <h1 className="h4 mb-4">{I18NextService.i18n.t("reports")}</h1>
            {this.selects()}
            {this.section}
            <PaginatorCursor
              current={this.state.cursor}
              resource={this.state.reportsRes}
              onPageChange={this.handlePageChange}
            />
          </div>
        </div>
      </div>
    );
  }

  get section() {
    switch (this.state.messageType) {
      case "All": {
        return this.all();
      }
      case "Comments": {
        return this.commentReports();
      }
      case "Posts": {
        return this.postReports();
      }
      case "PrivateMessages": {
        return this.privateMessageReports();
      }
      case "Communities": {
        return this.communityReports();
      }

      default: {
        return null;
      }
    }
  }

  unreadOrAllRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-unread`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.Unread}
          checked={this.state.unreadOrAll === UnreadOrAll.Unread}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-unread`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.Unread,
          })}
        >
          {I18NextService.i18n.t("unread")}
        </label>

        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={UnreadOrAll.All}
          checked={this.state.unreadOrAll === UnreadOrAll.All}
          onChange={linkEvent(this, this.handleUnreadOrAllChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.unreadOrAll === UnreadOrAll.All,
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>
      </div>
    );
  }

  messageTypeRadios() {
    const radioId = randomStr();

    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2" role="group">
        <input
          id={`${radioId}-all`}
          type="radio"
          className="btn-check"
          value={"All"}
          checked={this.state.messageType === "All"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "All",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-comments`}
          type="radio"
          className="btn-check"
          value={"Comments"}
          checked={this.state.messageType === "Comments"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-comments`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "Comments",
          })}
        >
          {I18NextService.i18n.t("comments")}
        </label>

        <input
          id={`${radioId}-posts`}
          type="radio"
          className="btn-check"
          value={"Posts"}
          checked={this.state.messageType === "Posts"}
          onChange={linkEvent(this, this.handleMessageTypeChange)}
        />
        <label
          htmlFor={`${radioId}-posts`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "Posts",
          })}
        >
          {I18NextService.i18n.t("posts")}
        </label>

        {amAdmin(this.isoData.myUserInfo) && (
          <>
            <input
              id={`${radioId}-messages`}
              type="radio"
              className="btn-check"
              value={"PrivateMessages"}
              checked={this.state.messageType === "PrivateMessages"}
              onChange={linkEvent(this, this.handleMessageTypeChange)}
            />
            <label
              htmlFor={`${radioId}-messages`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.state.messageType === "PrivateMessages",
              })}
            >
              {I18NextService.i18n.t("messages")}
            </label>

            <input
              id={`${radioId}-communities`}
              type="radio"
              className="btn-check"
              value={"Communities"}
              checked={this.state.messageType === "Communities"}
              onChange={linkEvent(this, this.handleMessageTypeChange)}
            />
            <label
              htmlFor={`${radioId}-communities`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.state.messageType === "Communities",
              })}
            >
              {I18NextService.i18n.t("communities")}
            </label>
          </>
        )}
      </div>
    );
  }

  selects() {
    return (
      <div className="mb-2">
        <span className="me-3">{this.unreadOrAllRadios()}</span>
        <span className="me-3">{this.messageTypeRadios()}</span>
        {this.isoData.myUserInfo?.local_user_view.local_user.admin && (
          <span className="me-3">
            <div
              className="btn-group btn-group-toggle flex-wrap mb-2"
              role="group"
            >
              <button
                class="btn btn-secondary"
                onClick={this.handleClickshowCommunityReports}
              >
                {I18NextService.i18n.t(
                  this.state.showCommunityRuleViolations
                    ? "hide_community_reports"
                    : "show_community_reports",
                )}
              </button>
            </div>
          </span>
        )}
      </div>
    );
  }

  renderItemType(i: ReportCombinedView): InfernoNode {
    const siteRes = this.state.siteRes;
    switch (i.type_) {
      case "Comment":
        return (
          <CommentReport
            key={i.type_ + i.comment_report.id}
            report={i}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onResolveReport={this.handleResolveCommentReport}
            onRemoveComment={this.handleRemoveComment}
            onAdminBan={this.handleAdminBan}
            onModBanFromCommunity={this.handleModBanFromCommunity}
          />
        );
      case "Post":
        return (
          <PostReport
            key={i.type_ + i.post_report.id}
            report={i}
            enableNsfw={enableNsfw(siteRes)}
            showAdultConsentModal={this.isoData.showAdultConsentModal}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onResolveReport={this.handleResolvePostReport}
            onRemovePost={this.handleRemovePost}
            onAdminBan={this.handleAdminBan}
            onModBanFromCommunity={this.handleModBanFromCommunity}
          />
        );
      case "PrivateMessage":
        return (
          <PrivateMessageReport
            key={i.type_ + i.private_message_report.id}
            report={i}
            onResolveReport={this.handleResolvePrivateMessageReport}
            myUserInfo={this.isoData.myUserInfo}
          />
        );
      case "Community":
        return (
          <CommunityReport
            key={i.type_ + i.community_report.id}
            report={i}
            onResolveReport={this.handleResolveCommunityReport}
            myUserInfo={this.isoData.myUserInfo}
          />
        );
    }
  }

  all() {
    switch (this.state.reportsRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success":
        return (
          <div>
            {this.state.reportsRes.data.reports.map(i => (
              <>
                <hr />
                {this.renderItemType(i)}
              </>
            ))}
          </div>
        );
    }
  }

  commentReports() {
    const res = this.state.reportsRes;
    const siteRes = this.state.siteRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.reports.filter(r => r.type_ === "Comment");
        return (
          <div>
            {reports.map(cr => (
              <>
                <hr />
                <CommentReport
                  key={cr.comment_report.id}
                  report={cr}
                  myUserInfo={this.isoData.myUserInfo}
                  localSite={siteRes.site_view.local_site}
                  admins={this.isoData.siteRes.admins}
                  onResolveReport={this.handleResolveCommentReport}
                  onRemoveComment={this.handleRemoveComment}
                  onAdminBan={this.handleAdminBan}
                  onModBanFromCommunity={this.handleModBanFromCommunity}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  postReports() {
    const res = this.state.reportsRes;
    const siteRes = this.state.siteRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.reports.filter(r => r.type_ === "Post");
        return (
          <div>
            {reports.map(pr => (
              <>
                <hr />
                <PostReport
                  key={pr.post_report.id}
                  enableNsfw={enableNsfw(siteRes)}
                  showAdultConsentModal={this.isoData.showAdultConsentModal}
                  report={pr}
                  myUserInfo={this.isoData.myUserInfo}
                  localSite={siteRes.site_view.local_site}
                  admins={this.isoData.siteRes.admins}
                  onResolveReport={this.handleResolvePostReport}
                  onRemovePost={this.handleRemovePost}
                  onAdminBan={this.handleAdminBan}
                  onModBanFromCommunity={this.handleModBanFromCommunity}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  privateMessageReports() {
    const res = this.state.reportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.reports.filter(
          r => r.type_ === "PrivateMessage",
        );
        return (
          <div>
            {reports.map(pmr => (
              <>
                <hr />
                <PrivateMessageReport
                  key={pmr.private_message_report.id}
                  report={pmr}
                  onResolveReport={this.handleResolvePrivateMessageReport}
                  myUserInfo={this.isoData.myUserInfo}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  communityReports() {
    const res = this.state.reportsRes;
    switch (res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const reports = res.data.reports.filter(r => r.type_ === "Community");
        return (
          <div>
            {reports.map(cr => (
              <>
                <hr />
                <CommunityReport
                  key={cr.community_report.id}
                  report={cr}
                  onResolveReport={this.handleResolveCommunityReport}
                  myUserInfo={this.isoData.myUserInfo}
                />
              </>
            ))}
          </div>
        );
      }
    }
  }

  async handlePageChange(cursor?: DirectionalCursor) {
    this.setState({ cursor });
    await this.refetch();
  }

  async handleUnreadOrAllChange(i: Reports, event: any) {
    i.setState({
      unreadOrAll: Number(event.target.value),
      cursor: undefined,
    });
    await i.refetch();
  }

  async handleMessageTypeChange(i: Reports, event: any) {
    switch (event.target.value) {
      case "All":
      case "Comments":
      case "Posts":
      case "PrivateMessages":
      case "Communities": {
        i.setState({
          messageType: event.target.value,
          cursor: undefined,
        });
        await i.refetch();
      }
    }
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<ReportsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const unresolved_only = true;

    const reportsForm: ListReports = {
      unresolved_only,
      show_community_rule_violations: false,
    };

    return {
      reportsRes: await client.listReports(reportsForm),
    };
  }

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const unresolved_only = this.state.unreadOrAll === UnreadOrAll.Unread;
    const cursor = this.state.cursor;

    this.setState({
      reportsRes: LOADING_REQUEST,
    });

    const form: ListReports = {
      unresolved_only,
      type_: this.state.messageType,
      show_community_rule_violations: this.state.showCommunityRuleViolations,
      ...cursorComponents(cursor),
    };

    const reportPromise = HttpService.client
      .listReports(form)
      .then(reportsRes => {
        if (token === this.refetchToken) {
          this.setState({ reportsRes });
        }
      });

    await Promise.all([reportPromise]);
  }

  async handleResolveCommentReport(form: ResolveCommentReport) {
    const res = await HttpService.client.resolveCommentReport(form);
    this.findAndUpdateCommentReport(res);
    this.update();
  }

  async handleResolvePostReport(form: ResolvePostReport) {
    const res = await HttpService.client.resolvePostReport(form);
    this.findAndUpdatePostReport(res);
    this.update();
  }

  async handleRemovePost(form: RemovePost) {
    await HttpService.client.removePost(form);
    this.update();
  }

  async handleRemoveComment(form: RemoveComment) {
    await HttpService.client.removeComment(form);
    this.update();
  }

  handleModBanFromCommunity(form: BanFromCommunityData) {
    this.setState({ banFromCommunityForm: form });
  }

  handleAdminBan(form: BanFromSiteData) {
    this.setState({ adminBanForm: form });
  }

  async handleResolvePrivateMessageReport(form: ResolvePrivateMessageReport) {
    const res = await HttpService.client.resolvePrivateMessageReport(form);
    this.findAndUpdatePrivateMessageReport(res);

    this.update();
  }

  async handleResolveCommunityReport(form: ResolveCommunityReport) {
    const res = await HttpService.client.resolveCommunityReport(form);
    toast("Not implemented");
    this.findAndUpdateCommunityReport(res);
    this.update();
  }

  async handleSubmitBanFromCommunity(form: BanUpdateForm) {
    const banFromCommunityForm = this.state.banFromCommunityForm;
    if (banFromCommunityForm) {
      await HttpService.client.banFromCommunity({
        person_id: banFromCommunityForm.person.id,
        community_id: banFromCommunityForm.community.id,
        ban: banFromCommunityForm.ban,
        expires_at: futureDaysToUnixTime(form.daysUntilExpires),
        reason: form.reason,
      });
      this.setState({ banFromCommunityForm: undefined });
      this.update();
    }
  }

  async handleSubmitAdminBan(form: BanUpdateForm) {
    const adminBanForm = this.state.adminBanForm;
    if (adminBanForm) {
      await HttpService.client.banPerson({
        person_id: adminBanForm.person.id,
        ban: adminBanForm.ban,
        expires_at: futureDaysToUnixTime(form.daysUntilExpires),
        reason: form.reason,
      });
      this.setState({ adminBanForm: undefined });
      this.update();
    }
  }

  handleCloseModActionModals() {
    this.setState({
      adminBanForm: undefined,
      banFromCommunityForm: undefined,
    });
  }

  handleClickshowCommunityReports() {
    this.setState({
      showCommunityRuleViolations: !this.state.showCommunityRuleViolations,
    });
    this.update();
  }

  findAndUpdateCommentReport(res: RequestState<CommentReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.reports = editCombined(
          { type_: "Comment", ...res.data.comment_report_view },
          s.reportsRes.data.reports,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  findAndUpdatePostReport(res: RequestState<PostReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.reports = editCombined(
          { type_: "Post", ...res.data.post_report_view },
          s.reportsRes.data.reports,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  findAndUpdatePrivateMessageReport(
    res: RequestState<PrivateMessageReportResponse>,
  ) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.reports = editCombined(
          { type_: "PrivateMessage", ...res.data.private_message_report_view },
          s.reportsRes.data.reports,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  findAndUpdateCommunityReport(res: RequestState<CommunityReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.reports = editCombined(
          { type_: "Community", ...res.data.community_report_view },
          s.reportsRes.data.reports,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  update() {
    UnreadCounterService.Instance.updateReports();
    this.refetch();
  }
}
