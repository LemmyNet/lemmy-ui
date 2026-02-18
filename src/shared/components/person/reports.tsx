import {
  editCombined,
  enableNsfw,
  getUncombinedReport,
  setIsoData,
  toast,
} from "@utils/app";
import { resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { amAdmin } from "@utils/roles";
import { ItemIdAndRes, itemLoading, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode } from "inferno";
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
  CommentReportId,
  PostReportId,
  PrivateMessageReportId,
  CommunityReportId,
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
import {
  FilterChipDropdown,
  FilterOption,
} from "@components/common/filter-chip-dropdown";
import { ShowUnreadOnlyCheckbox } from "@components/common/show-unread-only-checkbox";
import { FilterChipCheckbox } from "@components/common/filter-chip-checkbox";

type ReportsData = RouteDataResponse<{
  reportsRes: PagedResponse<ReportCombinedView>;
}>;

interface ReportsState {
  reportsRes: RequestState<PagedResponse<ReportCombinedView>>;
  commentResolveRes: ItemIdAndRes<CommentReportId, CommentReportResponse>;
  postResolveRes: ItemIdAndRes<PostReportId, PostReportResponse>;
  pmResolveRes: ItemIdAndRes<
    PrivateMessageReportId,
    PrivateMessageReportResponse
  >;
  communityResolveRes: ItemIdAndRes<CommunityReportId, CommunityReportResponse>;
  showUnreadOnly: boolean;
  reportType: ReportType;
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

const reportTypeOptions: FilterOption<ReportType>[] = [
  { value: "all", i18n: "all" },
  { value: "posts", i18n: "posts" },
  { value: "comments", i18n: "comments" },
  { value: "private_messages", i18n: "messages" },
  { value: "communities", i18n: "communities" },
];

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
    commentResolveRes: { id: 0, res: EMPTY_REQUEST },
    postResolveRes: { id: 0, res: EMPTY_REQUEST },
    pmResolveRes: { id: 0, res: EMPTY_REQUEST },
    communityResolveRes: { id: 0, res: EMPTY_REQUEST },
    showUnreadOnly: true,
    reportType: "all",
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
            loading={false}
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
            loading={false}
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
    switch (this.state.reportType) {
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

  reportTypeFilters() {
    // Only show communities and private messages if you're an admin.
    const options = amAdmin(this.isoData.myUserInfo)
      ? reportTypeOptions
      : reportTypeOptions.filter(
          v => !["private_messages", "communities"].includes(v.value),
        );

    return (
      <FilterChipDropdown
        label={"type"}
        allOptions={options}
        currentOption={options.find(t => t.value === this.state.reportType)}
        onSelect={val => handleReportTypeChange(this, val)}
      />
    );
  }

  selects() {
    return (
      <div className="row row-cols-auto align-items-center g-3 mb-2">
        <div className="col">
          <ShowUnreadOnlyCheckbox
            isChecked={this.state.showUnreadOnly}
            onCheck={val => handleShowUnreadOnlyChange(this, val)}
          />
        </div>
        <div className="col">{this.reportTypeFilters()}</div>
        {this.isoData.myUserInfo?.local_user_view.local_user.admin && (
          <div className="col">
            <FilterChipCheckbox
              option={"show_community_reports"}
              isChecked={this.state.showCommunityRuleViolations ?? false}
              onCheck={val => handleClickshowCommunityReports(this, val)}
            />
          </div>
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
            loading={
              itemLoading(this.state.commentResolveRes) === i.comment_report.id
            }
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
            loading={
              itemLoading(this.state.postResolveRes) === i.post_report.id
            }
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
            loading={
              itemLoading(this.state.pmResolveRes) ===
              i.private_message_report.id
            }
            myUserInfo={this.isoData.myUserInfo}
          />
        );
      case "community":
        return (
          <CommunityReport
            key={i.type_ + i.community_report.id}
            report={i}
            loading={
              itemLoading(this.state.communityResolveRes) ===
              i.community_report.id
            }
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
                  loading={
                    itemLoading(this.state.commentResolveRes) ===
                    cr.comment_report.id
                  }
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
                  loading={
                    itemLoading(this.state.postResolveRes) === pr.post_report.id
                  }
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
                  loading={
                    itemLoading(this.state.pmResolveRes) ===
                    pmr.private_message_report.id
                  }
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
                  loading={
                    itemLoading(this.state.communityResolveRes) ===
                    cr.community_report.id
                  }
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

  static fetchInitialData = async ({
    headers,
  }: InitialFetchRequest): Promise<ReportsData> => {
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
  };

  refetchToken?: symbol;
  async refetch() {
    const token = (this.refetchToken = Symbol());
    const cursor = this.state.cursor;

    this.setState({
      reportsRes: LOADING_REQUEST,
    });

    const form: ListReports = {
      unresolved_only: this.state.showUnreadOnly,
      type_: this.state.reportType,
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

  async update() {
    await UnreadCounterService.Instance.updateUnreadCounts();
    await this.refetch();
  }
}

async function handlePageChange(i: Reports, cursor?: PaginationCursor) {
  i.setState({ cursor });
  await i.refetch();
}

async function handleShowUnreadOnlyChange(i: Reports, showUnreadOnly: boolean) {
  i.setState({
    showUnreadOnly,
    cursor: undefined,
  });
  await i.refetch();
}

async function handleReportTypeChange(i: Reports, val: ReportType) {
  i.setState({
    reportType: val,
    cursor: undefined,
  });
  await i.refetch();
}

async function handleResolveCommentReport(
  i: Reports,
  form: ResolveCommentReport,
) {
  i.setState({
    commentResolveRes: { id: form.report_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.resolveCommentReport(form);
  i.setState({ commentResolveRes: { id: form.report_id, res } });
  i.findAndUpdateCommentReport(res);
  await i.update();
}

async function handleResolvePostReport(i: Reports, form: ResolvePostReport) {
  i.setState({
    postResolveRes: { id: form.report_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.resolvePostReport(form);
  i.setState({
    postResolveRes: { id: form.report_id, res },
  });
  i.findAndUpdatePostReport(res);
  await i.update();
}

async function handleRemovePost(i: Reports, form: RemovePost) {
  await HttpService.client.removePost(form);
  await i.update();
}

async function handleRemoveComment(i: Reports, form: RemoveComment) {
  await HttpService.client.removeComment(form);
  await i.update();
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
  i.setState({
    pmResolveRes: { id: form.report_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.resolvePrivateMessageReport(form);
  i.setState({
    pmResolveRes: { id: form.report_id, res },
  });
  i.findAndUpdatePrivateMessageReport(res);

  await i.update();
}

async function handleResolveCommunityReport(
  i: Reports,
  form: ResolveCommunityReport,
) {
  i.setState({
    communityResolveRes: { id: form.report_id, res: LOADING_REQUEST },
  });
  const res = await HttpService.client.resolveCommunityReport(form);
  i.setState({
    communityResolveRes: { id: form.report_id, res },
  });
  // TODO
  toast("Not implemented");
  i.findAndUpdateCommunityReport(res);
  await i.update();
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
    await i.update();
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
    await i.update();
  }
}

function handleCloseModActionModals(i: Reports) {
  i.setState({
    adminBanForm: undefined,
    banFromCommunityForm: undefined,
  });
}

async function handleClickshowCommunityReports(i: Reports, val: boolean) {
  i.setState({
    showCommunityRuleViolations: val,
  });
  await i.update();
}
