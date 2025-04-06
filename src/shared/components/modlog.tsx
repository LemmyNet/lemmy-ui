import {
  fetchUsers,
  getUncombinedModlog,
  personToChoice,
  setIsoData,
} from "@utils/app";
import {
  debounce,
  formatPastDate,
  getIdFromString,
  getQueryParams,
  getQueryString,
  resourcesSettled,
  bareRoutePush,
} from "@utils/helpers";
import { scrollMixin } from "./mixins/scroll-mixin";
import { amAdmin, amMod } from "@utils/roles";
import type { QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  GetModlogResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  LemmyHttp,
  ModlogActionType,
  ModlogCombinedView,
  Person,
  PaginationCursor,
} from "lemmy-js-client";
import { fetchLimit } from "@utils/config";
import { InitialFetchRequest } from "@utils/types";
import { FirstLoadService, I18NextService } from "../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../services/HttpService";
import { HtmlTags } from "./common/html-tags";
import { Icon, Spinner } from "./common/icon";
import { MomentTime } from "./common/moment-time";
import { SearchableSelect } from "./common/searchable-select";
import { CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";
import { getHttpBaseInternal } from "@utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { LoadingEllipses } from "./common/loading-ellipses";
import { PaginatorCursor } from "./common/paginator-cursor";
import { InfernoNode } from "inferno";

function getModPerson(view: ModlogCombinedView): Person | undefined {
  switch (view.type_) {
    case "AdminAllowInstance":
    case "AdminBlockInstance":
    case "AdminPurgeComment":
    case "AdminPurgeCommunity":
    case "AdminPurgePerson":
    case "AdminPurgePost":
      return view.admin;
    case "ModAdd":
    case "ModAddCommunity":
    case "ModBan":
    case "ModBanFromCommunity":
    case "ModFeaturePost":
    case "ModLockPost":
    case "ModRemoveComment":
    case "ModRemoveCommunity":
    case "ModRemovePost":
    case "ModTransferCommunity":
    case "ModChangeCommunityVisibility":
      return view.moderator;
  }
}

type FilterType = "mod" | "user";

type ModlogData = RouteDataResponse<{
  res: GetModlogResponse;
  communityRes: GetCommunityResponse;
  modUserResponse: GetPersonDetailsResponse;
  userResponse: GetPersonDetailsResponse;
}>;

export function getModlogQueryParams(source?: string): ModlogProps {
  return getQueryParams<ModlogProps>(
    {
      actionType: getActionFromString,
      modId: getIdFromString,
      userId: getIdFromString,
      page: (arg?: string) => arg,
      commentId: getIdFromString,
      postId: getIdFromString,
    },
    source,
  );
}

interface ModlogState {
  res: RequestState<GetModlogResponse>;
  communityRes: RequestState<GetCommunityResponse>;
  loadingModSearch: boolean;
  loadingUserSearch: boolean;
  modSearchOptions: Choice[];
  userSearchOptions: Choice[];
  isIsomorphic: boolean;
}

interface ModlogProps {
  page?: PaginationCursor;
  userId?: number;
  modId?: number;
  actionType: ModlogActionType;
  postId?: number;
  commentId?: number;
}

function getActionFromString(action?: string): ModlogActionType {
  return action !== undefined ? (action as ModlogActionType) : "All";
}

function renderModlogType(view: ModlogCombinedView): InfernoNode {
  // TODO: none of these use i18n
  switch (view.type_) {
    case "ModRemovePost": {
      const mrpv = view;
      const {
        mod_remove_post: { reason, removed },
        post: { name, id },
      } = mrpv;

      return (
        <>
          <span>{removed ? "Removed " : "Restored "}</span>
          <span>
            Post <Link to={`/post/${id}`}>{name}</Link>
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "ModLockPost": {
      const {
        mod_lock_post: { locked },
        post: { id, name },
      } = view;

      return (
        <>
          <span>{locked ? "Locked " : "Unlocked "}</span>
          <span>
            Post <Link to={`/post/${id}`}>{name}</Link>
          </span>
        </>
      );
    }

    case "ModFeaturePost": {
      const {
        mod_feature_post: { featured, is_featured_community },
        post: { id, name },
        community,
      } = view;

      return (
        <>
          <span>{featured ? "Featured " : "Unfeatured "}</span>
          <span>
            Post <Link to={`/post/${id}`}>{name}</Link>
          </span>
          <span>
            {is_featured_community
              ? " in community "
              : " in Local, from community "}
          </span>
          <CommunityLink community={community} />
        </>
      );
    }
    case "ModRemoveComment": {
      const mrc = view;
      const {
        mod_remove_comment: { reason, removed },
        comment: { id, content },
        other_person: commenter,
      } = mrc;

      return (
        <>
          <span>{removed ? "Removed " : "Restored "}</span>
          <span>
            Comment <Link to={`/comment/${id}`}>{content}</Link>
          </span>
          <span>
            {" "}
            by <PersonListing person={commenter} />
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "ModRemoveCommunity": {
      const mrco = view;
      const {
        mod_remove_community: { reason, removed },
        community,
      } = mrco;

      return (
        <>
          <span>{removed ? "Removed " : "Restored "}</span>
          <span>
            Community <CommunityLink community={community} />
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "ModBanFromCommunity": {
      const mbfc = view;
      const {
        mod_ban_from_community: { reason, expires, banned },
        other_person: banned_person,
        community,
      } = mbfc;

      return (
        <>
          <span>{banned ? "Banned " : "Unbanned "}</span>
          <span>
            <PersonListing person={banned_person} />
          </span>
          <span> from the community </span>
          <span>
            <CommunityLink community={community} />
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
          {expires && (
            <span>
              <div>expires: {formatPastDate(expires)}</div>
            </span>
          )}
        </>
      );
    }

    case "ModAddCommunity": {
      const {
        mod_add_community: { removed },
        other_person: modded_person,
        community,
      } = view;

      return (
        <>
          <span>{removed ? "Removed " : "Appointed "}</span>
          <span>
            <PersonListing person={modded_person} />
          </span>
          <span> as a mod to the community </span>
          <span>
            <CommunityLink community={community} />
          </span>
        </>
      );
    }

    case "ModTransferCommunity": {
      const { community, other_person: modded_person } = view;

      return (
        <>
          <span>Transferred</span>
          <span>
            <CommunityLink community={community} />
          </span>
          <span> to </span>
          <span>
            <PersonListing person={modded_person} />
          </span>
        </>
      );
    }

    case "ModBan": {
      const {
        mod_ban: { reason, expires, banned },
        other_person: banned_person,
      } = view;

      return (
        <>
          <span>{banned ? "Banned " : "Unbanned "}</span>
          <span>
            <PersonListing person={banned_person} />
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
          {expires && (
            <span>
              <div>expires: {formatPastDate(expires)}</div>
            </span>
          )}
        </>
      );
    }

    case "ModAdd": {
      const {
        mod_add: { removed },
        other_person: modded_person,
      } = view;

      return (
        <>
          <span>{removed ? "Removed " : "Appointed "}</span>
          <span>
            <PersonListing person={modded_person} />
          </span>
          <span> as an admin </span>
        </>
      );
    }
    case "AdminPurgePerson": {
      const {
        admin_purge_person: { reason },
      } = view;

      return (
        <>
          <span>Purged a Person</span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "AdminPurgeCommunity": {
      const {
        admin_purge_community: { reason },
      } = view;

      return (
        <>
          <span>Purged a Community</span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "AdminPurgePost": {
      const {
        admin_purge_post: { reason },
        community,
      } = view;

      return (
        <>
          <span>Purged a Post from </span>
          <CommunityLink community={community} />
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "AdminPurgeComment": {
      const {
        admin_purge_comment: { reason },
        post: { id, name },
      } = view;

      return (
        <>
          <span>
            Purged a Comment from <Link to={`/post/${id}`}>{name}</Link>
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "ModChangeCommunityVisibility": {
      const {
        mod_change_community_visibility: { reason, visibility },
        community,
      } = view;

      return (
        <>
          <span>Changed visibility of </span>
          <span>
            <CommunityLink community={community} />
          </span>
          <span>to {visibility}</span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "AdminAllowInstance": {
      const {
        instance: { domain },
        admin_allow_instance: { allowed, reason },
      } = view;

      return (
        <>
          <span>
            {I18NextService.i18n.t(
              allowed ? "added_item_to_list" : "removed_item_from_list",
              {
                item: domain,
                list: I18NextService.i18n.t("allowlist"),
              },
            )}
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }

    case "AdminBlockInstance": {
      const {
        instance: { domain },
        admin_block_instance: { blocked, reason },
      } = view;

      return (
        <>
          <span>
            {I18NextService.i18n.t(
              blocked ? "added_item_to_list" : "removed_item_from_list",
              {
                item: domain,
                list: I18NextService.i18n.t("blocklist"),
              },
            )}
          </span>
          {reason && (
            <span>
              <div>reason: {reason}</div>
            </span>
          )}
        </>
      );
    }
  }
}

const Filter = ({
  filterType,
  onChange,
  value,
  onSearch,
  options,
  loading,
}: {
  filterType: FilterType;
  onChange: (option: Choice) => void;
  value?: number | null;
  onSearch: (text: string) => void;
  options: Choice[];
  loading: boolean;
}) => (
  <div className="col-sm-6 mb-3">
    <label className="mb-2" htmlFor={`filter-${filterType}`}>
      {I18NextService.i18n.t(`filter_by_${filterType}` as NoOptionI18nKeys)}
    </label>
    <SearchableSelect
      id={`filter-${filterType}`}
      value={value ?? 0}
      options={[
        {
          label: I18NextService.i18n.t("all"),
          value: "0",
        },
      ].concat(options)}
      onChange={onChange}
      onSearch={onSearch}
      loading={loading}
    />
  </div>
);

async function createNewOptions({
  id,
  oldOptions,
  text,
}: {
  id?: number | null;
  oldOptions: Choice[];
  text: string;
}) {
  if (text.length > 0) {
    return oldOptions
      .filter(choice => parseInt(choice.value, 10) === id)
      .concat(
        (await fetchUsers(text)).slice(0, fetchLimit).map(personToChoice),
      );
  } else {
    return oldOptions;
  }
}

type ModlogPathProps = { communityId?: string };
type ModlogRouteProps = RouteComponentProps<ModlogPathProps> & ModlogProps;
export type ModlogFetchConfig = IRoutePropsWithFetch<
  ModlogData,
  ModlogPathProps,
  ModlogProps
>;

@scrollMixin
export class Modlog extends Component<ModlogRouteProps, ModlogState> {
  private isoData = setIsoData<ModlogData>(this.context);

  state: ModlogState = {
    res: EMPTY_REQUEST,
    communityRes: EMPTY_REQUEST,
    loadingModSearch: false,
    loadingUserSearch: false,
    userSearchOptions: [],
    modSearchOptions: [],
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.res]);
  }

  constructor(props: ModlogRouteProps, context: any) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleUserChange = this.handleUserChange.bind(this);
    this.handleModChange = this.handleModChange.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const { res, communityRes, modUserResponse, userResponse } =
        this.isoData.routeData;

      this.state = {
        ...this.state,
        res,
        communityRes,
        isIsomorphic: true,
      };

      if (modUserResponse.state === "success") {
        this.state = {
          ...this.state,
          modSearchOptions: [personToChoice(modUserResponse.data.person_view)],
        };
      }

      if (userResponse.state === "success") {
        this.state = {
          ...this.state,
          userSearchOptions: [personToChoice(userResponse.data.person_view)],
        };
      }
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await Promise.all([
        this.fetchModlog(this.props),
        this.fetchCommunity(this.props),
        this.fetchUser(this.props),
        this.fetchMod(this.props),
      ]);
    }
  }

  componentWillReceiveProps(nextProps: ModlogRouteProps) {
    this.fetchModlog(nextProps);

    const reload = bareRoutePush(this.props, nextProps);

    if (nextProps.modId !== this.props.modId || reload) {
      this.fetchMod(nextProps);
    }
    if (nextProps.userId !== this.props.userId || reload) {
      this.fetchUser(nextProps);
    }
    if (
      nextProps.match.params.communityId !==
        this.props.match.params.communityId ||
      reload
    ) {
      this.fetchCommunity(nextProps);
    }
  }

  fetchUserToken?: symbol;
  async fetchUser(props: ModlogRouteProps) {
    const token = (this.fetchUserToken = Symbol());
    const { userId } = props;

    if (userId) {
      const res = await HttpService.client.getPersonDetails({
        person_id: userId,
      });
      if (res.state === "success" && token === this.fetchUserToken) {
        this.setState({
          userSearchOptions: [personToChoice(res.data.person_view)],
        });
      }
    }
  }

  fetchModToken?: symbol;
  async fetchMod(props: ModlogRouteProps) {
    const token = (this.fetchModToken = Symbol());
    const { modId } = props;

    if (modId) {
      const res = await HttpService.client.getPersonDetails({
        person_id: modId,
      });
      if (res.state === "success" && token === this.fetchModToken) {
        this.setState({
          modSearchOptions: [personToChoice(res.data.person_view)],
        });
      }
    }
  }

  get combined() {
    const res = this.state.res;
    const combined = res.state === "success" ? res.data.modlog : [];

    return (
      <tbody>
        {combined.map((i: ModlogCombinedView) => {
          const mod = getModPerson(i);
          const view = getUncombinedModlog(i);
          return (
            <tr key={i.type_ + view.id}>
              <td>
                <MomentTime published={view.published} />
              </td>
              <td>
                {this.amAdminOrMod && mod ? (
                  <PersonListing person={mod} />
                ) : (
                  <div>{this.modOrAdminText(mod)}</div>
                )}
              </td>
              <td>{renderModlogType(i)}</td>
            </tr>
          );
        })}
      </tbody>
    );
  }

  get amAdminOrMod(): boolean {
    const amMod_ =
      this.state.communityRes.state === "success" &&
      amMod(this.state.communityRes.data.community_view.community.id);
    return amAdmin() || amMod_;
  }

  modOrAdminText(person?: Person): string {
    return person &&
      this.isoData.siteRes.admins.some(({ person: { id } }) => id === person.id)
      ? I18NextService.i18n.t("admin")
      : I18NextService.i18n.t("mod");
  }

  get documentTitle(): string {
    return `Modlog - ${this.isoData.siteRes.site_view.site.name}`;
  }

  render() {
    const {
      loadingModSearch,
      loadingUserSearch,
      userSearchOptions,
      modSearchOptions,
    } = this.state;
    const { actionType, modId, userId } = this.props;
    const { communityId } = this.props.match.params;

    const communityState = this.state.communityRes.state;
    const communityResp =
      communityState === "success" && this.state.communityRes.data;

    return (
      <div className="modlog container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />

        <h1 className="h4 mb-4">{I18NextService.i18n.t("modlog")}</h1>

        <div
          className="alert alert-warning text-sm-start text-xs-center"
          role="alert"
        >
          <Icon
            icon="alert-triangle"
            inline
            classes="me-sm-2 mx-auto d-sm-inline d-block"
          />
          <T i18nKey="modlog_content_warning" class="d-inline">
            #<strong>#</strong>#
          </T>
        </div>
        {communityId && (
          <h5>
            {communityResp ? (
              <>
                <Link
                  className="text-body"
                  to={`/c/${communityResp.community_view.community.name}`}
                >
                  /c/{communityResp.community_view.community.name}
                </Link>{" "}
                <span>{I18NextService.i18n.t("modlog")}</span>
              </>
            ) : (
              communityState === "loading" && (
                <>
                  <LoadingEllipses />
                  &nbsp;
                </>
              )
            )}
          </h5>
        )}
        <div className="row mb-2">
          <div className="col-sm-6">
            <select
              value={actionType}
              onChange={linkEvent(this, this.handleFilterActionChange)}
              className="form-select"
              aria-label="action"
            >
              <option disabled aria-hidden="true">
                {I18NextService.i18n.t("filter_by_action")}
              </option>
              <option value={"All"}>{I18NextService.i18n.t("all")}</option>
              <option value={"ModRemovePost"}>Removing Posts</option>
              <option value={"ModLockPost"}>Locking Posts</option>
              <option value={"ModFeaturePost"}>Featuring Posts</option>
              <option value={"ModRemoveComment"}>Removing Comments</option>
              <option value={"ModRemoveCommunity"}>Removing Communities</option>
              <option value={"ModBanFromCommunity"}>
                Banning From Communities
              </option>
              <option value={"ModAddCommunity"}>Adding Mod to Community</option>
              <option value={"ModTransferCommunity"}>
                Transferring Communities
              </option>
              <option value={"ModAdd"}>Adding Mod to Site</option>
              <option value={"ModBan"}>Banning From Site</option>
            </select>
          </div>
        </div>
        <div className="row mb-2">
          <Filter
            filterType="user"
            onChange={this.handleUserChange}
            onSearch={this.handleSearchUsers}
            value={userId}
            options={userSearchOptions}
            loading={loadingUserSearch}
          />
          {(this.amAdminOrMod ||
            !this.isoData.siteRes.site_view.local_site
              .hide_modlog_mod_names) && (
            <Filter
              filterType="mod"
              onChange={this.handleModChange}
              onSearch={this.handleSearchMods}
              value={modId}
              options={modSearchOptions}
              loading={loadingModSearch}
            />
          )}
        </div>
        {this.renderModlogTable()}
      </div>
    );
  }

  get nextPageCursor(): PaginationCursor | undefined {
    const { res } = this.state;
    return res.state === "success" ? res.data.next_page : undefined;
  }

  renderModlogTable() {
    switch (this.state.res.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        return (
          <div className="table-responsive">
            <table id="modlog_table" className="table table-sm table-hover">
              <thead className="pointer">
                <tr>
                  <th> {I18NextService.i18n.t("time")}</th>
                  <th>{I18NextService.i18n.t("mod")}</th>
                  <th>{I18NextService.i18n.t("action")}</th>
                </tr>
              </thead>
              {this.combined}
            </table>
            <PaginatorCursor
              nextPage={this.nextPageCursor}
              onNext={this.handlePageChange}
            />
          </div>
        );
      }
    }
  }

  handleFilterActionChange(i: Modlog, event: any) {
    i.updateUrl({
      actionType: event.target.value as ModlogActionType,
      page: undefined,
    });
  }

  handlePageChange(page: PaginationCursor) {
    this.updateUrl({ page });
  }

  handleUserChange(option: Choice) {
    this.updateUrl({ userId: getIdFromString(option.value), page: undefined });
  }

  handleModChange(option: Choice) {
    this.updateUrl({ modId: getIdFromString(option.value), page: undefined });
  }

  handleSearchUsers = debounce(async (text: string) => {
    if (!text.length) {
      return;
    }

    const { userId } = this.props;
    const { userSearchOptions } = this.state;
    this.setState({ loadingUserSearch: true });

    const newOptions = await createNewOptions({
      id: userId,
      text,
      oldOptions: userSearchOptions,
    });

    this.setState({
      userSearchOptions: newOptions,
      loadingUserSearch: false,
    });
  });

  handleSearchMods = debounce(async (text: string) => {
    if (!text.length) {
      return;
    }

    const { modId } = this.props;
    const { modSearchOptions } = this.state;
    this.setState({ loadingModSearch: true });

    const newOptions = await createNewOptions({
      id: modId,
      text,
      oldOptions: modSearchOptions,
    });

    this.setState({
      modSearchOptions: newOptions,
      loadingModSearch: false,
    });
  });

  async updateUrl(props: Partial<ModlogProps>) {
    const {
      actionType,
      modId,
      page,
      userId,
      match: {
        params: { communityId },
      },
    } = { ...this.props, ...props };

    const queryParams: QueryParams<ModlogProps> = {
      page,
      actionType: actionType,
      modId: modId?.toString(),
      userId: userId?.toString(),
    };

    this.props.history.push(
      `/modlog${communityId ? `/${communityId}` : ""}${getQueryString(
        queryParams,
      )}`,
    );
  }

  fetchModlogToken?: symbol;
  async fetchModlog(props: ModlogRouteProps) {
    const token = (this.fetchModlogToken = Symbol());
    const { actionType, page, modId, userId, postId, commentId } = props;
    const { communityId: urlCommunityId } = props.match.params;
    const communityId = getIdFromString(urlCommunityId);

    this.setState({ res: LOADING_REQUEST });
    const res = await HttpService.client.getModlog({
      community_id: communityId,
      page_cursor: page,
      type_: actionType,
      other_person_id: userId,
      mod_person_id: modId,
      comment_id: commentId,
      post_id: postId,
    });
    if (token === this.fetchModlogToken) {
      this.setState({ res });
    }
  }

  fetchCommunityToken?: symbol;
  async fetchCommunity(props: ModlogRouteProps) {
    const token = (this.fetchCommunityToken = Symbol());
    const { communityId: urlCommunityId } = props.match.params;
    const communityId = getIdFromString(urlCommunityId);

    if (communityId) {
      this.setState({ communityRes: LOADING_REQUEST });
      const communityRes = await HttpService.client.getCommunity({
        id: communityId,
      });
      if (token === this.fetchCommunityToken) {
        this.setState({ communityRes });
      }
    } else {
      this.setState({ communityRes: EMPTY_REQUEST });
    }
  }

  static async fetchInitialData({
    headers,
    query: { page, userId, modId, actionType, commentId, postId },
    match: {
      params: { communityId: urlCommunityId },
    },
  }: InitialFetchRequest<ModlogPathProps, ModlogProps>): Promise<ModlogData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const communityId = getIdFromString(urlCommunityId);

    const modlogForm: GetModlog = {
      page_cursor: page,
      community_id: communityId,
      type_: actionType,
      mod_person_id: modId,
      other_person_id: userId,
      comment_id: commentId,
      post_id: postId,
    };

    let communityResponse: RequestState<GetCommunityResponse> = EMPTY_REQUEST;

    if (communityId) {
      const communityForm: GetCommunity = {
        id: communityId,
      };

      communityResponse = await client.getCommunity(communityForm);
    }

    let modUserResponse: RequestState<GetPersonDetailsResponse> = EMPTY_REQUEST;

    if (modId) {
      const getPersonForm: GetPersonDetails = {
        person_id: modId,
      };

      modUserResponse = await client.getPersonDetails(getPersonForm);
    }

    let userResponse: RequestState<GetPersonDetailsResponse> = EMPTY_REQUEST;

    if (userId) {
      const getPersonForm: GetPersonDetails = {
        person_id: userId,
      };

      userResponse = await client.getPersonDetails(getPersonForm);
    }

    return {
      res: await client.getModlog(modlogForm),
      communityRes: communityResponse,
      modUserResponse,
      userResponse,
    };
  }
}
