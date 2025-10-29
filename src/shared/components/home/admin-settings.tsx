import { fetchThemeList, setIsoData, showLocal } from "@utils/app";
import {
  capitalizeFirstLetter,
  cursorComponents,
  resourcesSettled,
} from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { DirectionalCursor, RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component } from "inferno";
import {
  AdminAllowInstanceParams,
  AdminBlockInstanceParams,
  AdminListUsersResponse,
  CreateCustomEmoji,
  CreateOAuthProvider,
  CreateTagline,
  DeleteCustomEmoji,
  DeleteOAuthProvider,
  DeleteTagline,
  EditCustomEmoji,
  EditOAuthProvider,
  EditSite,
  GetFederatedInstancesResponse,
  GetSiteResponse,
  LemmyHttp,
  ListCustomEmojisResponse,
  ListMediaResponse,
  ListTaglinesResponse,
  UpdateTagline,
} from "lemmy-js-client";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import Tabs from "../common/tabs";
import { PersonListing } from "../person/person-listing";
import { EmojiForm } from "./emojis-form";
import RateLimitForm from "./rate-limit-form";
import { SiteForm } from "./site-form";
import { TaglineForm } from "./tagline-form";
import { getHttpBaseInternal } from "../../utils/env";
import { RouteComponentProps } from "inferno-router/dist/Route";
import { IRoutePropsWithFetch } from "@utils/routes";
import { MediaUploads } from "../common/media-uploads";
import { snapToTop } from "@utils/browser";
import { isBrowser } from "@utils/browser";
import ConfirmationModal from "../common/modal/confirmation-modal";
import OAuthProvidersTab from "./oauth/oauth-providers-tab";
import { InstanceBlockForm } from "./instance-block-form";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { fetchLimit } from "@utils/config";
import { linkEvent } from "inferno";
import { UserBadges } from "@components/common/user-badges";
import { MomentTime } from "@components/common/moment-time";
import { TableHr } from "@components/common/tables";
import { NoOptionI18nKeys } from "i18next";
import { InstanceList } from "./instances";
import { InstanceAllowForm } from "./instance-allow-form";

type AdminSettingsData = RouteDataResponse<{
  usersRes: AdminListUsersResponse;
  instancesRes: GetFederatedInstancesResponse;
  uploadsRes: ListMediaResponse;
  taglinesRes: ListTaglinesResponse;
  emojisRes: ListCustomEmojisResponse;
}>;

interface AdminSettingsState {
  instancesRes: RequestState<GetFederatedInstancesResponse>;
  usersRes: RequestState<AdminListUsersResponse>;
  usersCursor?: DirectionalCursor;
  usersBannedOnly: boolean;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  showConfirmLeaveAdmin: boolean;
  uploadsRes: RequestState<ListMediaResponse>;
  uploadsCursor?: DirectionalCursor;
  taglinesRes: RequestState<ListTaglinesResponse>;
  taglinesCursor?: DirectionalCursor;
  emojisRes: RequestState<ListCustomEmojisResponse>;
  loading: boolean;
  themeList: string[];
  isIsomorphic: boolean;
}

type AdminSettingsRouteProps = RouteComponentProps<Record<string, never>> &
  Record<string, never>;
export type AdminSettingsFetchConfig = IRoutePropsWithFetch<
  AdminSettingsData,
  Record<string, never>,
  Record<string, never>
>;

@scrollMixin
export class AdminSettings extends Component<
  AdminSettingsRouteProps,
  AdminSettingsState
> {
  private isoData = setIsoData<AdminSettingsData>(this.context);
  state: AdminSettingsState = {
    usersRes: EMPTY_REQUEST,
    usersBannedOnly: false,
    instancesRes: EMPTY_REQUEST,
    leaveAdminTeamRes: EMPTY_REQUEST,
    showConfirmLeaveAdmin: false,
    uploadsRes: EMPTY_REQUEST,
    taglinesRes: EMPTY_REQUEST,
    emojisRes: EMPTY_REQUEST,
    loading: false,
    themeList: [],
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([
      this.state.usersRes,
      this.state.instancesRes,
      this.state.uploadsRes,
      this.state.taglinesRes,
      this.state.emojisRes,
    ]);
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.handleEditSite = this.handleEditSite.bind(this);
    this.handleUsersPageChange = this.handleUsersPageChange.bind(this);
    this.handleUploadsPageChange = this.handleUploadsPageChange.bind(this);
    this.handleTaglinesPageChange = this.handleTaglinesPageChange.bind(this);
    this.handleToggleShowLeaveAdminConfirmation =
      this.handleToggleShowLeaveAdminConfirmation.bind(this);
    this.handleLeaveAdminTeam = this.handleLeaveAdminTeam.bind(this);
    this.handleEditOAuthProvider = this.handleEditOAuthProvider.bind(this);
    this.handleDeleteOAuthProvider = this.handleDeleteOAuthProvider.bind(this);
    this.handleCreateOAuthProvider = this.handleCreateOAuthProvider.bind(this);
    this.handleEditTagline = this.handleEditTagline.bind(this);
    this.handleDeleteTagline = this.handleDeleteTagline.bind(this);
    this.handleCreateTagline = this.handleCreateTagline.bind(this);
    this.handleEditEmoji = this.handleEditEmoji.bind(this);
    this.handleDeleteEmoji = this.handleDeleteEmoji.bind(this);
    this.handleCreateEmoji = this.handleCreateEmoji.bind(this);
    this.handleInstanceBlockCreate = this.handleInstanceBlockCreate.bind(this);
    this.handleInstanceBlockRemove = this.handleInstanceBlockRemove.bind(this);
    this.handleInstanceAllowCreate = this.handleInstanceAllowCreate.bind(this);
    this.handleInstanceAllowRemove = this.handleInstanceAllowRemove.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { usersRes, instancesRes, uploadsRes, taglinesRes, emojisRes } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        usersRes,
        instancesRes,
        uploadsRes,
        taglinesRes,
        emojisRes,
        isIsomorphic: true,
      };
    }
  }

  static async fetchInitialData({
    headers,
  }: InitialFetchRequest): Promise<AdminSettingsData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    return {
      usersRes: await client.listUsers({ banned_only: false }),
      instancesRes: await client.getFederatedInstances({ kind: "all" }),
      uploadsRes: await client.listMediaAdmin({ limit: fetchLimit }),
      taglinesRes: await client.listTaglines({ limit: fetchLimit }),
      emojisRes: await client.listCustomEmojis({}),
    };
  }

  async componentWillMount() {
    if (isBrowser()) {
      if (!this.state.isIsomorphic) {
        await this.fetchData();
      } else {
        const themeList = await fetchThemeList();
        this.setState({ themeList });
      }
    }
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("admin_settings")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="admin-settings container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        <Tabs
          tabs={[
            {
              key: "site",
              label: I18NextService.i18n.t("site"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane show", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="site-tab-pane"
                >
                  <h1 className="row justify-content-md-center h4 mb-4">
                    {I18NextService.i18n.t("site_config")}
                  </h1>
                  <div className="row justify-content-md-center">
                    <div className="col-12 col-md-6">
                      <SiteForm
                        showLocal={showLocal(this.isoData)}
                        onSaveSite={this.handleEditSite}
                        siteRes={this.isoData.siteRes}
                        themeList={this.state.themeList}
                        loading={this.state.loading}
                        myUserInfo={this.isoData.myUserInfo}
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "instance_blocks",
              label: I18NextService.i18n.t("instances"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="instance_blocks-tab-pane"
                >
                  {this.instanceBlocksTab()}
                </div>
              ),
            },
            {
              key: "users",
              label: I18NextService.i18n.t("users"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="users-tab-pane"
                >
                  {this.userListTitleAndSelects()}
                  {this.userList()}
                  <hr />
                  {this.admins()}
                </div>
              ),
            },
            {
              key: "rate_limiting",
              label: "Rate Limiting",
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="rate_limiting-tab-pane"
                >
                  <RateLimitForm
                    rateLimits={
                      this.isoData.siteRes?.site_view.local_site_rate_limit
                    }
                    onSaveSite={this.handleEditSite}
                    loading={this.state.loading}
                  />
                </div>
              ),
            },
            {
              key: "taglines",
              label: I18NextService.i18n.t("taglines"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="taglines-tab-pane"
                >
                  {this.taglinesTab()}
                </div>
              ),
            },
            {
              key: "emojis",
              label: I18NextService.i18n.t("emojis"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="emojis-tab-pane"
                >
                  {this.emojisTab()}
                </div>
              ),
            },
            {
              key: "uploads",
              label: I18NextService.i18n.t("uploads"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="uploads-tab-pane"
                >
                  {this.uploads()}
                </div>
              ),
            },
            {
              key: "auth",
              label: I18NextService.i18n.t("authentication"),
              getNode: isSelected => (
                <div
                  className={classNames("tab-pane", {
                    active: isSelected,
                  })}
                  role="tabpanel"
                  id="auth-tab-pane"
                >
                  <OAuthProvidersTab
                    oauthProviders={
                      this.isoData.siteRes?.admin_oauth_providers ?? []
                    }
                    onCreate={this.handleCreateOAuthProvider}
                    onDelete={this.handleDeleteOAuthProvider}
                    onEdit={this.handleEditOAuthProvider}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  async fetchData() {
    this.setState({
      usersRes: LOADING_REQUEST,
      instancesRes: LOADING_REQUEST,
      uploadsRes: LOADING_REQUEST,
      taglinesRes: LOADING_REQUEST,
      emojisRes: LOADING_REQUEST,
      themeList: [],
    });

    const [
      usersRes,
      instancesRes,
      uploadsRes,
      taglinesRes,
      emojisRes,
      themeList,
    ] = await Promise.all([
      HttpService.client.listUsers({
        banned_only: this.state.usersBannedOnly,
        ...cursorComponents(this.state.usersCursor),
        limit: fetchLimit,
      }),
      HttpService.client.getFederatedInstances({ kind: "all" }),
      HttpService.client.listMediaAdmin({
        ...cursorComponents(this.state.uploadsCursor),
        limit: fetchLimit,
      }),
      HttpService.client.listTaglines({
        ...cursorComponents(this.state.taglinesCursor),
        limit: fetchLimit,
      }),
      HttpService.client.listCustomEmojis({}),
      fetchThemeList(),
    ]);

    this.setState({
      usersRes,
      instancesRes,
      uploadsRes,
      taglinesRes,
      emojisRes,
      themeList,
    });
  }

  async fetchUsersOnly() {
    this.setState({
      usersRes: LOADING_REQUEST,
    });
    const usersRes = await HttpService.client.listUsers({
      ...cursorComponents(this.state.uploadsCursor),
      banned_only: this.state.usersBannedOnly,
      limit: fetchLimit,
    });

    this.setState({ usersRes });
  }

  async fetchUploadsOnly() {
    this.setState({
      uploadsRes: LOADING_REQUEST,
    });
    const uploadsRes = await HttpService.client.listMediaAdmin({
      ...cursorComponents(this.state.uploadsCursor),
      limit: fetchLimit,
    });

    this.setState({ uploadsRes });
  }

  async fetchTaglinesOnly() {
    this.setState({
      taglinesRes: LOADING_REQUEST,
    });
    const taglinesRes = await HttpService.client.listTaglines({
      ...cursorComponents(this.state.taglinesCursor),
      limit: fetchLimit,
    });

    this.setState({ taglinesRes });
  }

  async fetchEmojisOnly() {
    this.setState({
      emojisRes: LOADING_REQUEST,
    });
    const emojisRes = await HttpService.client.listCustomEmojis({});

    this.setState({ emojisRes });
  }

  async fetchInstancesOnly() {
    this.setState({
      instancesRes: LOADING_REQUEST,
    });
    const instancesRes = await HttpService.client.getFederatedInstances({
      kind: "all",
    });

    this.setState({ instancesRes });
  }

  admins() {
    const admins = this.isoData.siteRes.admins;

    const nameCols = "col-12 col-md-6";
    const dataCols = "col-4 col-md-2";

    return (
      <>
        <h1 className="h4 mb-4">
          {capitalizeFirstLetter(I18NextService.i18n.t("admins"))}
        </h1>
        <div id="admins-table">
          <div className="row">
            <div className={`${nameCols} fw-bold`}>
              {I18NextService.i18n.t("username")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("registered_date_title")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("posts")}
            </div>
            <div className={`${dataCols} fw-bold`}>
              {I18NextService.i18n.t("comments")}
            </div>
          </div>
          <TableHr />
          {admins.map(admin => (
            <>
              <div className="row" key={admin.person.id}>
                <div className={nameCols}>
                  <PersonListing
                    person={admin.person}
                    banned={admin.banned}
                    myUserInfo={this.isoData.myUserInfo}
                  />
                  <UserBadges
                    classNames="ms-1"
                    isAdmin={admin.is_admin}
                    isBanned={admin.banned}
                    myUserInfo={this.isoData.myUserInfo}
                    creator={admin.person}
                  />
                </div>
                <div className={dataCols}>
                  <MomentTime published={admin.person.published_at} />
                </div>
                <div className={dataCols}>{admin.person.post_count}</div>
                <div className={dataCols}>{admin.person.comment_count}</div>
              </div>
              <hr />
            </>
          ))}
        </div>
        {this.leaveAdmin()}
        <ConfirmationModal
          message={I18NextService.i18n.t("leave_admin_team_confirmation")}
          loadingMessage={I18NextService.i18n.t("leaving_admin_team")}
          onNo={this.handleToggleShowLeaveAdminConfirmation}
          onYes={this.handleLeaveAdminTeam}
          show={this.state.showConfirmLeaveAdmin}
        />
      </>
    );
  }

  leaveAdmin() {
    return (
      <button
        onClick={this.handleToggleShowLeaveAdminConfirmation}
        className="btn btn-danger mb-2"
      >
        {this.state.leaveAdminTeamRes.state === "loading" ? (
          <Spinner />
        ) : (
          I18NextService.i18n.t("leave_admin_team")
        )}
      </button>
    );
  }

  userListTitleAndSelects() {
    return (
      <>
        <h1 className="h4 mb-4">{I18NextService.i18n.t("users")}</h1>
        <div className="row align-items-center mb-3 g-3">
          <div className="col-auto">
            <div
              className="data-type-select btn-group btn-group-toggle flex-wrap"
              role="group"
            >
              <input
                id={`users-all`}
                type="radio"
                className="btn-check"
                value="true"
                checked={!this.state.usersBannedOnly}
                onChange={linkEvent(this, this.handleUsersBannedOnlyChange)}
              />
              <label
                htmlFor={`users-all`}
                className={classNames("pointer btn btn-outline-secondary", {
                  active: !this.state.usersBannedOnly,
                })}
              >
                {I18NextService.i18n.t("all")}
              </label>
              <input
                id={`users-banned-only`}
                type="radio"
                className="btn-check"
                value="false"
                checked={this.state.usersBannedOnly}
                onChange={linkEvent(this, this.handleUsersBannedOnlyChange)}
              />
              <label
                htmlFor={`users-banned-only`}
                className={classNames("pointer btn btn-outline-secondary", {
                  active: this.state.usersBannedOnly,
                })}
              >
                {I18NextService.i18n.t("banned")}
              </label>
            </div>
          </div>
        </div>
      </>
    );
  }

  userList() {
    switch (this.state.usersRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const local_users = this.state.usersRes.data.users;
        const nameCols = "col-12 col-md-3";
        const dataCols = "col-4 col-md-2";

        return (
          <div id="users-table">
            <div className="row">
              <div className={`${nameCols} fw-bold`}>
                {I18NextService.i18n.t("username")}
              </div>
              <div className={`${nameCols} fw-bold`}>
                {I18NextService.i18n.t("email")}
              </div>
              <div className={`${dataCols} fw-bold`}>
                {I18NextService.i18n.t("registered_date_title")}
              </div>
              <div className={`${dataCols} fw-bold`}>
                {I18NextService.i18n.t("posts")}
              </div>
              <div className={`${dataCols} fw-bold`}>
                {I18NextService.i18n.t("comments")}
              </div>
            </div>
            <TableHr />
            {local_users.map(local_user => (
              <>
                <div className="row" key={local_user.person.id}>
                  <div className={nameCols}>
                    <PersonListing
                      person={local_user.person}
                      banned={local_user.banned}
                      myUserInfo={this.isoData.myUserInfo}
                    />
                    <UserBadges
                      classNames="ms-1"
                      isAdmin={local_user.local_user.admin}
                      isBanned={local_user.banned}
                      myUserInfo={this.isoData.myUserInfo}
                      creator={local_user.person}
                    />
                  </div>
                  <div className={nameCols}>{local_user.local_user.email}</div>
                  <div className={dataCols}>
                    <MomentTime published={local_user.person.published_at} />
                  </div>
                  <div className={dataCols}>{local_user.person.post_count}</div>
                  <div className={dataCols}>
                    {local_user.person.comment_count}
                  </div>
                </div>
                <hr />
              </>
            ))}
            <PaginatorCursor
              current={this.state.usersCursor}
              resource={this.state.usersRes}
              onPageChange={this.handleUsersPageChange}
            />
          </div>
        );
      }
    }
  }

  uploads() {
    switch (this.state.uploadsRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const uploadsRes = this.state.uploadsRes.data;
        return (
          <div>
            <MediaUploads
              showUploader
              uploads={uploadsRes}
              myUserInfo={this.isoData.myUserInfo}
            />
            <PaginatorCursor
              current={this.state.uploadsCursor}
              resource={this.state.uploadsRes}
              onPageChange={this.handleUploadsPageChange}
            />
          </div>
        );
      }
    }
  }

  taglinesTab() {
    switch (this.state.taglinesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const taglines = this.state.taglinesRes.data.taglines;

        return (
          <>
            <h1 className="h4 mb-4">{I18NextService.i18n.t("taglines")}</h1>
            {taglines.map(t => (
              <TaglineForm
                key={`tagline-form-${t.id}`}
                tagline={t}
                myUserInfo={this.isoData.myUserInfo}
                onEdit={this.handleEditTagline}
                onDelete={this.handleDeleteTagline}
              />
            ))}
            {this.emptyTaglineForm()}
            {taglines.length > 0 && (
              <PaginatorCursor
                current={this.state.taglinesCursor}
                resource={this.state.taglinesRes}
                onPageChange={this.handleTaglinesPageChange}
              />
            )}
          </>
        );
      }
    }
  }

  emojisTab() {
    switch (this.state.emojisRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const emojis = this.state.emojisRes.data.custom_emojis;

        return (
          <>
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("custom_emojis")}
            </h1>
            {emojis.map(e => (
              <EmojiForm
                key={`emoji-form-${e.custom_emoji.id}`}
                emoji={e}
                onEdit={this.handleEditEmoji}
                onDelete={this.handleDeleteEmoji}
              />
            ))}
            {this.emptyEmojiForm()}
            {/* TODO Pagination is completely missing for emojis */}
          </>
        );
      }
    }
  }

  emptyTaglineForm() {
    return (
      <TaglineForm
        myUserInfo={this.isoData.myUserInfo}
        onCreate={this.handleCreateTagline}
      />
    );
  }

  emptyEmojiForm() {
    return <EmojiForm onCreate={this.handleCreateEmoji} />;
  }

  instanceBlocksTab() {
    switch (this.state.instancesRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const instances = this.state.instancesRes.data.federated_instances;
        return (
          <div>
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("blocked_instances")}
            </h1>
            <InstanceList
              items={
                instances
                  .filter(view => view.blocked)
                  .map(view => view.instance) ?? []
              }
              blocked
              hideNoneFound
              onRemove={this.handleInstanceBlockRemove}
            />
            <InstanceBlockForm onCreate={this.handleInstanceBlockCreate} />
            <hr />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("allowed_instances")}
            </h1>
            <InstanceList
              items={
                instances
                  .filter(view => view.allowed)
                  .map(view => view.instance) ?? []
              }
              hideNoneFound
              onRemove={this.handleInstanceAllowRemove}
            />
            <InstanceAllowForm onCreate={this.handleInstanceAllowCreate} />
          </div>
        );
      }
    }
  }

  async handleInstanceBlockCreate(form: AdminBlockInstanceParams) {
    this.setState({ loading: true });

    const res = await HttpService.client.adminBlockInstance(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("blocked_x", { item: form.instance }));
      await this.fetchInstancesOnly();
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }

    this.setState({ loading: false });
  }

  async handleInstanceBlockRemove(instance: string) {
    this.setState({ loading: true });

    const form: AdminBlockInstanceParams = {
      instance,
      block: false,
      reason: "",
    };
    const res = await HttpService.client.adminBlockInstance(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("unblocked_x", { item: form.instance }));
      await this.fetchInstancesOnly();
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }

    this.setState({ loading: false });
  }

  async handleInstanceAllowCreate(form: AdminAllowInstanceParams) {
    this.setState({ loading: true });

    const res = await HttpService.client.adminAllowInstance(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("allowed_x", { item: form.instance }));
      await this.fetchInstancesOnly();
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }

    this.setState({ loading: false });
  }

  async handleInstanceAllowRemove(instance: string) {
    this.setState({ loading: true });

    const form: AdminAllowInstanceParams = {
      instance,
      allow: false,
      reason: "",
    };
    const res = await HttpService.client.adminAllowInstance(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("disallowed_x", { item: form.instance }));
      await this.fetchInstancesOnly();
    } else if (res.state === "failed") {
      toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
    }

    this.setState({ loading: false });
  }

  async handleEditSite(form: EditSite) {
    this.setState({ loading: true });

    const editRes = await HttpService.client.editSite(form);

    if (editRes.state === "success") {
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));

      // You need to reload the page, to properly update the siteRes everywhere
      setTimeout(() => location.reload(), 500);
    }

    this.setState({ loading: false });

    return editRes;
  }

  handleToggleShowLeaveAdminConfirmation() {
    this.setState(prev => ({
      showConfirmLeaveAdmin: !prev.showConfirmLeaveAdmin,
    }));
  }

  async handleLeaveAdminTeam() {
    this.setState({ leaveAdminTeamRes: LOADING_REQUEST });
    this.setState({
      leaveAdminTeamRes: await HttpService.client.leaveAdmin(),
    });

    if (this.state.leaveAdminTeamRes.state === "success") {
      toast(I18NextService.i18n.t("left_admin_team"));
      this.setState({ showConfirmLeaveAdmin: false });
      this.context.router.history.replace("/");
    }
  }

  async handleUsersBannedOnlyChange(i: AdminSettings, event: any) {
    const checked = event.target.value === "false";
    i.setState({ usersBannedOnly: checked });
    await i.fetchUsersOnly();
  }

  async handleUsersPageChange(cursor: DirectionalCursor) {
    this.setState({ usersCursor: cursor });
    await this.fetchUsersOnly();
  }

  async handleUploadsPageChange(cursor: DirectionalCursor) {
    this.setState({ uploadsCursor: cursor });
    snapToTop();
    await this.fetchUploadsOnly();
  }

  async handleTaglinesPageChange(cursor: DirectionalCursor) {
    this.setState({ taglinesCursor: cursor });
    snapToTop();
    await this.fetchTaglinesOnly();
  }

  async handleEditOAuthProvider(form: EditOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.editOAuthProvider(form);

    if (res.state === "success") {
      const newOAuthProvider = res.data;
      this.isoData.siteRes.oauth_providers =
        this.isoData.siteRes.oauth_providers?.map(p => {
          return p?.id === newOAuthProvider.id ? newOAuthProvider : p;
        }) ?? [newOAuthProvider];
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_edit_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleDeleteOAuthProvider(form: DeleteOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.deleteOAuthProvider(form);

    if (res.state === "success") {
      this.isoData.siteRes.oauth_providers =
        this.isoData.siteRes.oauth_providers?.filter(p => p.id !== form.id);
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_delete_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleCreateOAuthProvider(form: CreateOAuthProvider) {
    this.setState({ loading: true });

    const res = await HttpService.client.createOAuthProvider(form);
    if (res.state === "success") {
      this.isoData.siteRes.oauth_providers = [
        ...(this.isoData.siteRes.oauth_providers ?? []),
        res.data,
      ];
      this.forceUpdate();
      toast(I18NextService.i18n.t("site_saved"));
    } else {
      toast(I18NextService.i18n.t("couldnt_create_oauth_provider"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleCreateTagline(form: CreateTagline) {
    this.setState({ loading: true });
    const res = await HttpService.client.createTagline(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("tagline_created"));
      await this.fetchTaglinesOnly();
    } else {
      toast(I18NextService.i18n.t("couldnt_create_tagline"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleDeleteTagline(form: DeleteTagline) {
    this.setState({ loading: true });
    const res = await HttpService.client.deleteTagline(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("tagline_deleted"));
      await this.fetchTaglinesOnly();
    } else {
      toast(I18NextService.i18n.t("couldnt_delete_tagline"), "danger");
    }
    this.setState({ loading: false });
  }

  async handleEditTagline(form: UpdateTagline) {
    this.setState({ loading: true });
    const res = await HttpService.client.editTagline(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("tagline_updated"));
    } else {
      toast(I18NextService.i18n.t("couldnt_update_tagline"), "danger");
    }
    this.setState({ loading: false });
  }

  async handleCreateEmoji(form: CreateCustomEmoji) {
    const res = await HttpService.client.createCustomEmoji(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("custom_emoji_created"));
      await this.fetchEmojisOnly();
    } else {
      toast(I18NextService.i18n.t("couldnt_create_custom_emoji"), "danger");
    }

    this.setState({ loading: false });
  }

  async handleDeleteEmoji(form: DeleteCustomEmoji) {
    this.setState({ loading: true });
    const res = await HttpService.client.deleteCustomEmoji(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("custom_emoji_deleted"));
      await this.fetchEmojisOnly();
    } else {
      toast(I18NextService.i18n.t("couldnt_delete_custom_emoji"), "danger");
    }
    this.setState({ loading: false });
  }

  async handleEditEmoji(form: EditCustomEmoji) {
    this.setState({ loading: true });
    const res = await HttpService.client.editCustomEmoji(form);

    if (res.state === "success") {
      toast(I18NextService.i18n.t("custom_emoji_updated"));
    } else {
      toast(I18NextService.i18n.t("couldnt_update_custom_emoji"), "danger");
    }
    this.setState({ loading: false });
  }
}
