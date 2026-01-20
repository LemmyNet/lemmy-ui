import {
  editCombined,
  enableNsfw,
  getUncombinedReport,
  setIsoData,
  toast,
} from "@utils/app";
import { randomStr, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { amAdmin } from "@utils/roles";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component, FormEvent, InfernoNode } from "inferno";
import {
  CommentReportResponse,
  GetSiteResponse,
  LemmyHttp,
  ListReports,
  PagedResponse,
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
  reportsRes: PagedResponse<ReportCombinedView>;
}>;

interface ReportsState {
  reportsRes: RequestState<PagedResponse<ReportCombinedView>>;
  unreadOrAll: UnreadOrAll;
  messageType: ReportType;
  siteRes: GetSiteResponse;
  cursor?: PaginationCursor;
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
    messageType: "all",
    siteRes: this.isoData.siteRes,
    isIsomorphic: false,
    showCommunityRuleViolations: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.reportsRes]);
  }

  constructor(props: any, context: any) {
    super(props, context);

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
            onSubmit={form => handleSubmitBanFromCommunity(this, form)}
            modActionType="community-ban"
            creator={banFromCommunityForm.person}
            community={banFromCommunityForm.community}
            isBanned={!banFromCommunityForm.ban}
            onCancel={() => handleCloseModActionModals(this)}
            show
          />
        )}
        {adminBanForm && (
          <ModActionFormModal
            onSubmit={form => handleSubmitAdminBan(this, form)}
            modActionType="site-ban"
            creator={adminBanForm.person}
            isBanned={!adminBanForm.ban}
            onCancel={() => handleCloseModActionModals(this)}
            show
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
              onPageChange={cursor => handlePageChange(this, cursor)}
            />
          </div>
        </div>
      </div>
    );
  }

  get section() {
    switch (this.state.messageType) {
      case "all": {
        return this.all();
      }
      case "comments": {
        return this.commentReports();
      }
      case "posts": {
        return this.postReports();
      }
      case "private_messages": {
        return this.privateMessageReports();
      }
      case "communities": {
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
          onChange={e => handleUnreadOrAllChange(this, e)}
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
          onChange={e => handleUnreadOrAllChange(this, e)}
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
          value={"all"}
          checked={this.state.messageType === "all"}
          onChange={e => handleMessageTypeChange(this, e)}
        />
        <label
          htmlFor={`${radioId}-all`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "all",
          })}
        >
          {I18NextService.i18n.t("all")}
        </label>

        <input
          id={`${radioId}-comments`}
          type="radio"
          className="btn-check"
          value={"comments"}
          checked={this.state.messageType === "comments"}
          onChange={e => handleMessageTypeChange(this, e)}
        />
        <label
          htmlFor={`${radioId}-comments`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "comments",
          })}
        >
          {I18NextService.i18n.t("comments")}
        </label>

        <input
          id={`${radioId}-posts`}
          type="radio"
          className="btn-check"
          value={"posts"}
          checked={this.state.messageType === "posts"}
          onChange={e => handleMessageTypeChange(this, e)}
        />
        <label
          htmlFor={`${radioId}-posts`}
          className={classNames("btn btn-outline-secondary pointer", {
            active: this.state.messageType === "posts",
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
              value={"private_messages"}
              checked={this.state.messageType === "private_messages"}
              onChange={e => handleMessageTypeChange(this, e)}
            />
            <label
              htmlFor={`${radioId}-messages`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.state.messageType === "private_messages",
              })}
            >
              {I18NextService.i18n.t("messages")}
            </label>

            <input
              id={`${radioId}-communities`}
              type="radio"
              className="btn-check"
              value={"communities"}
              checked={this.state.messageType === "communities"}
              onChange={e => handleMessageTypeChange(this, e)}
            />
            <label
              htmlFor={`${radioId}-communities`}
              className={classNames("btn btn-outline-secondary pointer", {
                active: this.state.messageType === "communities",
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
                className="btn btn-secondary"
                onClick={() => handleClickshowCommunityReports(this)}
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
      case "comment":
        return (
          <CommentReport
            key={i.type_ + i.comment_report.id}
            report={i}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onResolveReport={form => handleResolveCommentReport(this, form)}
            onRemoveComment={form => handleRemoveComment(this, form)}
            onAdminBan={form => handleAdminBan(this, form)}
            onModBanFromCommunity={form =>
              handleModBanFromCommunity(this, form)
            }
          />
        );
      case "post":
        return (
          <PostReport
            key={i.type_ + i.post_report.id}
            report={i}
            enableNsfw={enableNsfw(siteRes)}
            showAdultConsentModal={this.isoData.showAdultConsentModal}
            myUserInfo={this.isoData.myUserInfo}
            localSite={siteRes.site_view.local_site}
            admins={this.isoData.siteRes.admins}
            onResolveReport={form => handleResolvePostReport(this, form)}
            onRemovePost={form => handleRemovePost(this, form)}
            onAdminBan={form => handleAdminBan(this, form)}
            onModBanFromCommunity={form =>
              handleModBanFromCommunity(this, form)
            }
          />
        );
      case "private_message":
        return (
          <PrivateMessageReport
            key={i.type_ + i.private_message_report.id}
            report={i}
            onResolveReport={form =>
              handleResolvePrivateMessageReport(this, form)
            }
            myUserInfo={this.isoData.myUserInfo}
          />
        );
      case "community":
        return (
          <CommunityReport
            key={i.type_ + i.community_report.id}
            report={i}
            onResolveReport={form => handleResolveCommunityReport(this, form)}
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
            {this.state.reportsRes.data.items.map(i => (
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
        const reports = res.data.items.filter(r => r.type_ === "comment");
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
                  onResolveReport={form =>
                    handleResolveCommentReport(this, form)
                  }
                  onRemoveComment={form => handleRemoveComment(this, form)}
                  onAdminBan={form => handleAdminBan(this, form)}
                  onModBanFromCommunity={form =>
                    handleModBanFromCommunity(this, form)
                  }
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
        const reports = res.data.items.filter(r => r.type_ === "post");
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
                  onResolveReport={form => handleResolvePostReport(this, form)}
                  onRemovePost={form => handleRemovePost(this, form)}
                  onAdminBan={form => handleAdminBan(this, form)}
                  onModBanFromCommunity={form =>
                    handleModBanFromCommunity(this, form)
                  }
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
        const reports = res.data.items.filter(
          r => r.type_ === "private_message",
        );
        return (
          <div>
            {reports.map(pmr => (
              <>
                <hr />
                <PrivateMessageReport
                  key={pmr.private_message_report.id}
                  report={pmr}
                  onResolveReport={form =>
                    handleResolvePrivateMessageReport(this, form)
                  }
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
        const reports = res.data.items.filter(r => r.type_ === "community");
        return (
          <div>
            {reports.map(cr => (
              <>
                <hr />
                <CommunityReport
                  key={cr.community_report.id}
                  report={cr}
                  onResolveReport={form =>
                    handleResolveCommunityReport(this, form)
                  }
                  myUserInfo={this.isoData.myUserInfo}
                />
              </>
            ))}
          </div>
        );
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
      page_cursor: cursor,
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

  findAndUpdateCommentReport(res: RequestState<CommentReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.items = editCombined(
          { type_: "comment", ...res.data.comment_report_view },
          s.reportsRes.data.items,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  findAndUpdatePostReport(res: RequestState<PostReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.items = editCombined(
          { type_: "post", ...res.data.post_report_view },
          s.reportsRes.data.items,
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
        s.reportsRes.data.items = editCombined(
          { type_: "private_message", ...res.data.private_message_report_view },
          s.reportsRes.data.items,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  findAndUpdateCommunityReport(res: RequestState<CommunityReportResponse>) {
    this.setState(s => {
      if (s.reportsRes.state === "success" && res.state === "success") {
        s.reportsRes.data.items = editCombined(
          { type_: "community", ...res.data.community_report_view },
          s.reportsRes.data.items,
          getUncombinedReport,
        );
      }
      return s;
    });
  }

  update() {
    UnreadCounterService.Instance.updateUnreadCounts();
    this.refetch();
  }
}

async function handlePageChange(i: Reports, cursor?: PaginationCursor) {
  i.setState({ cursor });
  await i.refetch();
}

async function handleUnreadOrAllChange(
  i: Reports,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    unreadOrAll: Number(event.target.value),
    cursor: undefined,
  });
  await i.refetch();
}

async function handleMessageTypeChange(
  i: Reports,
  event: FormEvent<HTMLInputElement>,
) {
  switch (event.target.value) {
    case "all":
    case "comments":
    case "posts":
    case "private_messages":
    case "communities": {
      i.setState({
        messageType: event.target.value,
        cursor: undefined,
      });
      await i.refetch();
    }
  }
}

async function handleResolveCommentReport(
  i: Reports,
  form: ResolveCommentReport,
) {
  const res = await HttpService.client.resolveCommentReport(form);
  i.findAndUpdateCommentReport(res);
  i.update();
}

async function handleResolvePostReport(i: Reports, form: ResolvePostReport) {
  const res = await HttpService.client.resolvePostReport(form);
  i.findAndUpdatePostReport(res);
  i.update();
}

async function handleRemovePost(i: Reports, form: RemovePost) {
  await HttpService.client.removePost(form);
  i.update();
}

async function handleRemoveComment(i: Reports, form: RemoveComment) {
  await HttpService.client.removeComment(form);
  i.update();
}

function handleModBanFromCommunity(i: Reports, form: BanFromCommunityData) {
  i.setState({ banFromCommunityForm: form });
}

function handleAdminBan(i: Reports, form: BanFromSiteData) {
  i.setState({ adminBanForm: form });
}

async function handleResolvePrivateMessageReport(
  i: Reports,
  form: ResolvePrivateMessageReport,
) {
  const res = await HttpService.client.resolvePrivateMessageReport(form);
  i.findAndUpdatePrivateMessageReport(res);

  i.update();
}

async function handleResolveCommunityReport(
  i: Reports,
  form: ResolveCommunityReport,
) {
  const res = await HttpService.client.resolveCommunityReport(form);
  toast("Not implemented");
  i.findAndUpdateCommunityReport(res);
  i.update();
}

async function handleSubmitBanFromCommunity(i: Reports, form: BanUpdateForm) {
  const banFromCommunityForm = i.state.banFromCommunityForm;
  if (banFromCommunityForm) {
    await HttpService.client.banFromCommunity({
      person_id: banFromCommunityForm.person.id,
      community_id: banFromCommunityForm.community.id,
      ban: banFromCommunityForm.ban,
      expires_at: futureDaysToUnixTime(form.daysUntilExpires),
      reason: form.reason,
    });
    i.setState({ banFromCommunityForm: undefined });
    i.update();
  }
}

async function handleSubmitAdminBan(i: Reports, form: BanUpdateForm) {
  const adminBanForm = i.state.adminBanForm;
  if (adminBanForm) {
    await HttpService.client.banPerson({
      person_id: adminBanForm.person.id,
      ban: adminBanForm.ban,
      expires_at: futureDaysToUnixTime(form.daysUntilExpires),
      reason: form.reason,
    });
    i.setState({ adminBanForm: undefined });
    i.update();
  }
}

function handleCloseModActionModals(i: Reports) {
  i.setState({
    adminBanForm: undefined,
    banFromCommunityForm: undefined,
  });
}

function handleClickshowCommunityReports(i: Reports) {
  i.setState({
    showCommunityRuleViolations: !i.state.showCommunityRuleViolations,
  });
  i.update();
}
