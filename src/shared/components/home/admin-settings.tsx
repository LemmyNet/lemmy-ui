import { fetchThemeList, setIsoData, showLocal } from "@utils/app";
import { capitalizeFirstLetter, resourcesSettled } from "@utils/helpers";
import { scrollMixin } from "../mixins/scroll-mixin";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { Component } from "inferno";
import {
  AdminAllowInstanceParams,
  AdminBlockInstanceParams,
  PagedResponse,
  LocalUserView,
  CreateCustomEmoji,
  CreateOAuthProvider,
  CreateTagline,
  DeleteCustomEmoji,
  DeleteOAuthProvider,
  DeleteTagline,
  EditCustomEmoji,
  EditOAuthProvider,
  EditSite,
  FederatedInstanceView,
  GetSiteResponse,
  LemmyHttp,
  ListCustomEmojisResponse,
  LocalImageView,
  Tagline,
  EditTagline,
  PaginationCursor,
  GetFederatedInstancesKind,
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
import { Icon, Spinner } from "../common/icon";
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
import { UserBadges } from "@components/common/user-badges";
import { MomentTime } from "@components/common/moment-time";
import { TableHr } from "@components/common/tables";
import { NoOptionI18nKeys } from "i18next";
import { InstanceList } from "./instances";
import { InstanceAllowForm } from "./instance-allow-form";
import {
  AllOrBanned,
  AllOrBannedDropdown,
} from "@components/common/all-or-banned-dropdown";
import { InstancesKindDropdown } from "@components/common/instances-kind-dropdown";
import { FormEvent } from "inferno";

type AdminSettingsData = RouteDataResponse<{
  usersRes: PagedResponse<LocalUserView>;
  instancesRes: PagedResponse<FederatedInstanceView>;
  uploadsRes: PagedResponse<LocalImageView>;
  taglinesRes: PagedResponse<Tagline>;
  emojisRes: ListCustomEmojisResponse;
}>;

interface AdminSettingsState {
  instancesRes: RequestState<PagedResponse<FederatedInstanceView>>;
  usersRes: RequestState<PagedResponse<LocalUserView>>;
  instancesKind: GetFederatedInstancesKind;
  instancesCursor?: PaginationCursor;
  instancesDomainFilter?: string;
  usersCursor?: PaginationCursor;
  allOrBanned: AllOrBanned;
  leaveAdminTeamRes: RequestState<GetSiteResponse>;
  showConfirmLeaveAdmin: boolean;
  uploadsRes: RequestState<PagedResponse<LocalImageView>>;
  uploadsCursor?: PaginationCursor;
  taglinesRes: RequestState<PagedResponse<Tagline>>;
  taglinesCursor?: PaginationCursor;
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
    allOrBanned: "all",
    instancesRes: EMPTY_REQUEST,
    instancesKind: "all",
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

  static fetchInitialData = async ({
    headers,
  }: InitialFetchRequest): Promise<AdminSettingsData> => {
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
  };

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
                        onEdit={form => handleEditSite(this, form)}
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
                    onSaveSite={form => handleEditSite(this, form)}
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
                    onCreate={form => handleCreateOAuthProvider(this, form)}
                    onDelete={form => handleDeleteOAuthProvider(this, form)}
                    onEdit={form => handleEditOAuthProvider(this, form)}
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
        banned_only: this.state.allOrBanned === "banned",
        page_cursor: this.state.usersCursor,
        limit: fetchLimit,
      }),
      HttpService.client.getFederatedInstances({ kind: "all" }),
      HttpService.client.listMediaAdmin({
        page_cursor: this.state.uploadsCursor,
        limit: fetchLimit,
      }),
      HttpService.client.listTaglines({
        page_cursor: this.state.taglinesCursor,
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
      page_cursor: this.state.usersCursor,
      banned_only: this.state.allOrBanned === "banned",
      limit: fetchLimit,
    });

    this.setState({ usersRes });
  }

  async fetchUploadsOnly() {
    this.setState({
      uploadsRes: LOADING_REQUEST,
    });
    const uploadsRes = await HttpService.client.listMediaAdmin({
      page_cursor: this.state.uploadsCursor,
      limit: fetchLimit,
    });

    this.setState({ uploadsRes });
  }

  async fetchTaglinesOnly() {
    this.setState({
      taglinesRes: LOADING_REQUEST,
    });
    const taglinesRes = await HttpService.client.listTaglines({
      page_cursor: this.state.taglinesCursor,
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
      kind: this.state.instancesKind,
      domain_filter: this.state.instancesDomainFilter,
      page_cursor: this.state.instancesCursor,
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
          onNo={() => handleToggleShowLeaveAdminConfirmation(this)}
          onYes={() => handleLeaveAdminTeam(this)}
          show={this.state.showConfirmLeaveAdmin}
        />
      </>
    );
  }

  leaveAdmin() {
    return (
      <button
        onClick={() => handleToggleShowLeaveAdminConfirmation(this)}
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
        <div className="row row-cols-auto align-items-center mb-3 g-3">
          <div className="col">
            <AllOrBannedDropdown
              currentOption={this.state.allOrBanned}
              onSelect={val => handleUsersAllOrBannedChange(this, val)}
            />
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
        const local_users = this.state.usersRes.data.items;
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
              onPageChange={cursor => handleUsersPageChange(this, cursor)}
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
              onPageChange={cursor => handleUploadsPageChange(this, cursor)}
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
        const taglines = this.state.taglinesRes.data.items;

        return (
          <>
            <h1 className="h4 mb-4">{I18NextService.i18n.t("taglines")}</h1>
            {taglines.map(t => (
              <TaglineForm
                key={`tagline-form-${t.id}`}
                tagline={t}
                myUserInfo={this.isoData.myUserInfo}
                onEdit={form => handleEditTagline(this, form)}
                onDelete={form => handleDeleteTagline(this, form)}
              />
            ))}
            {this.emptyTaglineForm()}
            {taglines.length > 0 && (
              <PaginatorCursor
                current={this.state.taglinesCursor}
                resource={this.state.taglinesRes}
                onPageChange={cursor => handleTaglinesPageChange(this, cursor)}
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
                onEdit={form => handleEditEmoji(this, form)}
                onDelete={form => handleDeleteEmoji(this, form)}
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
        onCreate={form => handleCreateTagline(this, form)}
      />
    );
  }

  emptyEmojiForm() {
    return <EmojiForm onCreate={form => handleCreateEmoji(this, form)} />;
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
        const instances = this.state.instancesRes.data.items;

        return (
          <div>
            <h1 className="h4">{I18NextService.i18n.t("instances")}</h1>
            <div className="row row-cols-auto align-items-center g-3 mb-2">
              <div className="col me-auto">
                <InstancesKindDropdown
                  currentOption={this.state.instancesKind}
                  onSelect={val => handleInstancesKindChange(this, val)}
                />
              </div>
              <form
                className="d-flex col"
                onSubmit={e => handleInstancesDomainSearchSubmit(this, e)}
              >
                <input
                  name="q"
                  type="search"
                  className="form-control"
                  placeholder={`${I18NextService.i18n.t("search")}...`}
                  aria-label={I18NextService.i18n.t("search")}
                  value={this.state.instancesDomainFilter}
                  onInput={e => handleInstancesDomainFilterChange(this, e)}
                />
                <button
                  type="submit"
                  className="btn btn-light border-light-subtle ms-1"
                >
                  <Icon icon="search" />
                </button>
              </form>
            </div>
            <InstanceList
              instances={instances}
              hideNoneFound
              showRemove={["blocked", "allowed"].includes(
                this.state.instancesKind,
              )}
              onRemove={instance => {
                if (this.state.instancesKind === "blocked") {
                  handleInstanceBlockRemove(this, instance);
                } else if (this.state.instancesKind === "allowed") {
                  handleInstanceAllowRemove(this, instance);
                }
              }}
            />
            <PaginatorCursor
              current={this.state.instancesCursor}
              resource={this.state.instancesRes}
              onPageChange={cursor => handleInstancesPageChange(this, cursor)}
            />
            <hr />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("block_instance")}
            </h1>
            <InstanceBlockForm
              onCreate={form => handleInstanceBlockCreate(this, form)}
            />
            <hr />
            <h1 className="h4 mb-4">
              {I18NextService.i18n.t("allow_instance")}
            </h1>
            <InstanceAllowForm
              onCreate={form => handleInstanceAllowCreate(this, form)}
            />
          </div>
        );
      }
    }
  }
}

async function handleInstanceBlockCreate(
  i: AdminSettings,
  form: AdminBlockInstanceParams,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.adminBlockInstance(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("blocked_x", { item: form.instance }));
    await i.fetchInstancesOnly();
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }

  i.setState({ loading: false });
}

async function handleInstanceBlockRemove(i: AdminSettings, instance: string) {
  i.setState({ loading: true });

  const form: AdminBlockInstanceParams = {
    instance,
    block: false,
    reason: "",
  };
  const res = await HttpService.client.adminBlockInstance(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("unblocked_x", { item: form.instance }));
    await i.fetchInstancesOnly();
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }

  i.setState({ loading: false });
}

async function handleInstanceAllowCreate(
  i: AdminSettings,
  form: AdminAllowInstanceParams,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.adminAllowInstance(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("allowed_x", { item: form.instance }));
    await i.fetchInstancesOnly();
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }

  i.setState({ loading: false });
}

async function handleInstanceAllowRemove(i: AdminSettings, instance: string) {
  i.setState({ loading: true });

  const form: AdminAllowInstanceParams = {
    instance,
    allow: false,
    reason: "",
  };
  const res = await HttpService.client.adminAllowInstance(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("disallowed_x", { item: form.instance }));
    await i.fetchInstancesOnly();
  } else if (res.state === "failed") {
    toast(I18NextService.i18n.t(res.err.name as NoOptionI18nKeys), "danger");
  }

  i.setState({ loading: false });
}

async function handleEditSite(i: AdminSettings, form: EditSite) {
  i.setState({ loading: true });

  const editRes = await HttpService.client.editSite(form);

  if (editRes.state === "success") {
    i.forceUpdate();
    toast(I18NextService.i18n.t("site_saved"));

    // You need to reload the page, to properly update the siteRes everywhere
    setTimeout(() => location.reload(), 500);
  }

  i.setState({ loading: false });

  return editRes;
}

function handleToggleShowLeaveAdminConfirmation(i: AdminSettings) {
  i.setState(prev => ({
    showConfirmLeaveAdmin: !prev.showConfirmLeaveAdmin,
  }));
}

async function handleLeaveAdminTeam(i: AdminSettings) {
  i.setState({ leaveAdminTeamRes: LOADING_REQUEST });
  i.setState({
    leaveAdminTeamRes: await HttpService.client.leaveAdmin(),
  });

  if (i.state.leaveAdminTeamRes.state === "success") {
    toast(I18NextService.i18n.t("left_admin_team"));
    i.setState({ showConfirmLeaveAdmin: false });
    i.context.router.history.replace("/");
  }
}

async function handleUsersAllOrBannedChange(
  i: AdminSettings,
  allOrBanned: AllOrBanned,
) {
  i.setState({ allOrBanned, usersCursor: undefined });
  await i.fetchUsersOnly();
}

async function handleUsersPageChange(
  i: AdminSettings,
  cursor?: PaginationCursor,
) {
  i.setState({ usersCursor: cursor });
  await i.fetchUsersOnly();
}

async function handleUploadsPageChange(
  i: AdminSettings,
  cursor?: PaginationCursor,
) {
  i.setState({ uploadsCursor: cursor });
  snapToTop();
  await i.fetchUploadsOnly();
}

async function handleTaglinesPageChange(
  i: AdminSettings,
  cursor?: PaginationCursor,
) {
  i.setState({ taglinesCursor: cursor });
  snapToTop();
  await i.fetchTaglinesOnly();
}

async function handleInstancesKindChange(
  i: AdminSettings,
  instancesKind: GetFederatedInstancesKind,
) {
  i.setState({ instancesKind, instancesCursor: undefined });
  await i.fetchInstancesOnly();
}

async function handleInstancesPageChange(
  i: AdminSettings,
  instancesCursor?: PaginationCursor,
) {
  i.setState({ instancesCursor });
  await i.fetchInstancesOnly();
}

function handleInstancesDomainFilterChange(
  i: AdminSettings,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({
    instancesDomainFilter: event.target.value,
    instancesCursor: undefined,
  });
}

async function handleInstancesDomainSearchSubmit(
  i: AdminSettings,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();
  await i.fetchInstancesOnly();
}

async function handleEditOAuthProvider(
  i: AdminSettings,
  form: EditOAuthProvider,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.editOAuthProvider(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("site_saved"));

    // You need to reload the page, to properly update the siteRes everywhere
    setTimeout(() => location.reload(), 500);
  } else {
    toast(I18NextService.i18n.t("couldnt_edit_oauth_provider"), "danger");
  }

  i.setState({ loading: false });
}

async function handleDeleteOAuthProvider(
  i: AdminSettings,
  form: DeleteOAuthProvider,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.deleteOAuthProvider(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("site_saved"));

    // You need to reload the page, to properly update the siteRes everywhere
    setTimeout(() => location.reload(), 500);
  } else {
    toast(I18NextService.i18n.t("couldnt_delete_oauth_provider"), "danger");
  }

  i.setState({ loading: false });
}

async function handleCreateOAuthProvider(
  i: AdminSettings,
  form: CreateOAuthProvider,
) {
  i.setState({ loading: true });

  const res = await HttpService.client.createOAuthProvider(form);
  if (res.state === "success") {
    toast(I18NextService.i18n.t("site_saved"));

    // You need to reload the page, to properly update the siteRes everywhere
    setTimeout(() => location.reload(), 500);
  } else {
    toast(I18NextService.i18n.t("couldnt_create_oauth_provider"), "danger");
  }

  i.setState({ loading: false });
}

async function handleCreateTagline(i: AdminSettings, form: CreateTagline) {
  i.setState({ loading: true });
  const res = await HttpService.client.createTagline(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("tagline_created"));
    await i.fetchTaglinesOnly();
  } else {
    toast(I18NextService.i18n.t("couldnt_create_tagline"), "danger");
  }

  i.setState({ loading: false });
}

async function handleDeleteTagline(i: AdminSettings, form: DeleteTagline) {
  i.setState({ loading: true });
  const res = await HttpService.client.deleteTagline(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("tagline_deleted"));
    await i.fetchTaglinesOnly();
  } else {
    toast(I18NextService.i18n.t("couldnt_delete_tagline"), "danger");
  }
  i.setState({ loading: false });
}

async function handleEditTagline(i: AdminSettings, form: EditTagline) {
  i.setState({ loading: true });
  const res = await HttpService.client.editTagline(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("tagline_updated"));
  } else {
    toast(I18NextService.i18n.t("couldnt_update_tagline"), "danger");
  }
  i.setState({ loading: false });
}

async function handleCreateEmoji(i: AdminSettings, form: CreateCustomEmoji) {
  const res = await HttpService.client.createCustomEmoji(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("custom_emoji_created"));
    await i.fetchEmojisOnly();
  } else {
    toast(I18NextService.i18n.t("couldnt_create_custom_emoji"), "danger");
  }

  i.setState({ loading: false });
}

async function handleDeleteEmoji(i: AdminSettings, form: DeleteCustomEmoji) {
  i.setState({ loading: true });
  const res = await HttpService.client.deleteCustomEmoji(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("custom_emoji_deleted"));
    await i.fetchEmojisOnly();
  } else {
    toast(I18NextService.i18n.t("couldnt_delete_custom_emoji"), "danger");
  }
  i.setState({ loading: false });
}

async function handleEditEmoji(i: AdminSettings, form: EditCustomEmoji) {
  i.setState({ loading: true });
  const res = await HttpService.client.editCustomEmoji(form);

  if (res.state === "success") {
    toast(I18NextService.i18n.t("custom_emoji_updated"));
  } else {
    toast(I18NextService.i18n.t("couldnt_update_custom_emoji"), "danger");
  }
  i.setState({ loading: false });
}
