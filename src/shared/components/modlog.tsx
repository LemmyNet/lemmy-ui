import { fetchUsers, personToChoice, setIsoData } from "@utils/app";
import {
  debounce,
  getIdFromString,
  getQueryParams,
  getQueryString,
  resourcesSettled,
  bareRoutePush,
  cursorComponents,
} from "@utils/helpers";
import { formatRelativeDate, nowBoolean } from "@utils/date";
import { scrollMixin } from "./mixins/scroll-mixin";
import { amAdmin, amMod } from "@utils/roles";
import type { DirectionalCursor, QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  CommunityVisibility,
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  GetModlogResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  LemmyHttp,
  ModlogActionType,
  ModlogCombinedView,
  MyUserInfo,
  Person,
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
import { communityLink, CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";
import { getHttpBaseInternal } from "../utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { isBrowser } from "@utils/browser";
import { LoadingEllipses } from "./common/loading-ellipses";
import { PaginatorCursor } from "./common/paginator-cursor";
import { TableHr } from "./common/tables";

const TIME_COLS = "col-6 col-md-2";
const MOD_COLS = "col-6 col-md-4";
const ACTION_COLS = "col-12 col-md-6";

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
      commentId: getIdFromString,
      postId: getIdFromString,
      cursor: (cursor?: string) => cursor,
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
  cursor?: DirectionalCursor;
  userId?: number;
  modId?: number;
  actionType: ModlogActionType;
  postId?: number;
  commentId?: number;
}

function getActionFromString(action?: string): ModlogActionType {
  return action !== undefined ? (action as ModlogActionType) : "All";
}

interface ModlogEntry {
  id: number;
  moderator?: Person;
  publishedAt: string;
  data: InfernoNode;
}

function mapCommunityVisibility(visibility: CommunityVisibility): string {
  switch (visibility) {
    case "LocalOnlyPrivate": {
      return "Private (Local Only)";
    }

    case "LocalOnlyPublic": {
      return "Public (Local Only)";
    }

    case "Private":
    case "Public":
    case "Unlisted": {
      return visibility;
    }

    default: {
      return "";
    }
  }
}

function processModlogEntry(
  view: ModlogCombinedView,
  myUserInfo: MyUserInfo | undefined,
): ModlogEntry {
  switch (view.type_) {
    default:
      // FIXME: placeholder for version mismatch between js-client and backend
      // Without a default case typescript is able to report missing types
      return {
        id: 0,
        publishedAt: nowBoolean(true)!,
        data: (
          <>
            <span>Placeholder for:</span>{" "}
            <span>{(view as { type_: string }).type_}</span>
          </>
        ),
      };

    case "AdminAllowInstance": {
      const {
        admin_allow_instance: { id, published_at },
        admin,
        instance: { domain },
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
          <>
            <span>Allowed instance</span>
            <span>{domain}</span>
          </>
        ),
      };
    }

    case "AdminBlockInstance": {
      const {
        admin_block_instance: { id, published_at },
        admin,
        instance: { domain },
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
          <>
            <span>Blocked Instance</span>
            <span>{domain}</span>
          </>
        ),
      };
    }

    case "AdminPurgeComment": {
      const {
        admin_purge_comment: { id, reason, published_at },
        post: { name },
        admin,
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
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
        ),
      };
    }

    case "AdminPurgeCommunity": {
      const {
        admin_purge_community: { id, reason, published_at },
        admin,
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
          <>
            <span>Purged a Community</span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "AdminPurgePerson": {
      const {
        admin_purge_person: { id, reason, published_at },
        admin,
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
          <>
            <span>Purged a Person</span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "AdminPurgePost": {
      const {
        admin_purge_post: { id, reason, published_at },
        admin,
        community,
      } = view;

      return {
        id,
        moderator: admin,
        publishedAt: published_at,
        data: (
          <>
            <span>Purged Post From</span>
            <CommunityLink community={community} myUserInfo={myUserInfo} />
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "AdminAdd": {
      const {
        admin_add: { id, removed, published_at },
        moderator,
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{removed ? "Removed " : "Appointed "}</span>
            <span>
              <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            <span> as an admin </span>
          </>
        ),
      };
    }

    case "ModAddToCommunity": {
      const {
        mod_add_to_community: { id, removed, published_at },
        moderator,
        community,
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{removed ? "Removed " : "Appointed "}</span>
            <span>
              <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            <span> as a mod to the community </span>
            <span>
              <CommunityLink community={community} myUserInfo={myUserInfo} />
            </span>
          </>
        ),
      };
    }

    case "AdminBan": {
      const {
        admin_ban: { id, reason, expires_at, banned, published_at },
        moderator,
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{banned ? "Banned " : "Unbanned "}</span>
            <span>
              <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
            {expires_at && (
              <span>
                <div>expires: {formatRelativeDate(expires_at)}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModBanFromCommunity": {
      const {
        mod_ban_from_community: {
          id,
          reason,
          expires_at,
          banned,
          published_at,
        },
        moderator,
        community,
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{banned ? "Banned " : "Unbanned "}</span>
            <span>
              <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            <span> from the community </span>
            <span>
              <CommunityLink community={community} myUserInfo={myUserInfo} />
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
            {expires_at && (
              <span>
                <div>expires: {formatRelativeDate(expires_at)}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModChangeCommunityVisibility": {
      const {
        mod_change_community_visibility: { id, visibility, published_at },
        moderator,
        community,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>Set visibility of</span>
            <span>
              <CommunityLink community={community} myUserInfo={myUserInfo} />
            </span>
            <span>
              <div>to: {mapCommunityVisibility(visibility)}</div>
            </span>
          </>
        ),
      };
    }

    case "ModFeaturePost": {
      const {
        mod_feature_post: { id, featured, is_featured_community, published_at },
        post: { id: postId, name },
        moderator,
        community,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{featured ? "Featured " : "Unfeatured "}</span>
            <span>
              Post <Link to={`/post/${postId}`}>{name}</Link>
            </span>
            <span>
              {is_featured_community
                ? " in community "
                : " in Local, from community "}
            </span>
            <CommunityLink community={community} myUserInfo={myUserInfo} />
          </>
        ),
      };
    }

    case "ModLockPost": {
      const {
        mod_lock_post: { id, locked, published_at, reason },
        moderator,
        post: { id: postId, name },
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{locked ? "Locked " : "Unlocked "}</span>
            <span>
              Post <Link to={`/post/${postId}`}>{name}</Link>
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModRemoveComment": {
      const {
        mod_remove_comment: { id, reason, removed, published_at },
        moderator,
        comment: { id: commentId, content },
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{removed ? "Removed " : "Restored "}</span>
            <span>
              Comment <Link to={`/comment/${commentId}`}>{content}</Link>
            </span>
            <span>
              {" "}
              by <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModLockComment": {
      const {
        mod_lock_comment: { id, reason, locked, published_at },
        moderator,
        comment: { id: commentId, content },
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{locked ? "Locked " : "Unlocked "}</span>
            <span>
              Comment <Link to={`/comment/${commentId}`}>{content}</Link>
            </span>
            <span>
              {" "}
              by <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "AdminRemoveCommunity": {
      const {
        admin_remove_community: { id, reason, removed, published_at },
        moderator,
        community,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{removed ? "Removed " : "Restored "}</span>
            <span>
              Community{" "}
              <CommunityLink community={community} myUserInfo={myUserInfo} />
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModRemovePost": {
      const {
        mod_remove_post: { id, reason, removed, published_at },
        moderator,
        post: { name, id: postId },
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>{removed ? "Removed " : "Restored "}</span>
            <span>
              Post <Link to={`/post/${postId}`}>{name}</Link>
            </span>
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "ModTransferCommunity": {
      const {
        mod_transfer_community: { id, published_at },
        moderator,
        community,
        other_person,
      } = view;

      return {
        id,
        moderator,
        publishedAt: published_at,
        data: (
          <>
            <span>Transferred</span>
            <span>
              <CommunityLink community={community} myUserInfo={myUserInfo} />
            </span>
            <span> to </span>
            <span>
              <PersonListing person={other_person} myUserInfo={myUserInfo} />
            </span>
          </>
        ),
      };
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
      {I18NextService.i18n.t(`filter_by_${filterType}`)}
    </label>
    <SearchableSelect
      id={`filter-${filterType}`}
      value={value ?? 0}
      options={[
        {
          label: I18NextService.i18n.t("all") as string,
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
    const { myUserInfo } = this.isoData;

    return combined.map(i => {
      const { id, moderator, publishedAt, data } = processModlogEntry(
        i,
        myUserInfo,
      );

      return (
        <>
          <div className="row" key={id}>
            <div className={TIME_COLS}>
              <MomentTime published={publishedAt} />
            </div>
            <div className={MOD_COLS}>
              {this.amAdminOrMod && moderator ? (
                <PersonListing person={moderator} myUserInfo={myUserInfo} />
              ) : (
                <div>{this.modOrAdminText(moderator)}</div>
              )}
            </div>
            <div className={ACTION_COLS}>{data}</div>
          </div>
          <hr />
        </>
      );
    });
  }

  get amAdminOrMod(): boolean {
    const amMod_ =
      this.state.communityRes.state === "success" &&
      amMod(this.state.communityRes.data.community_view);
    return amAdmin(this.isoData.myUserInfo) || amMod_;
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
          <T i18nKey="modlog_content_warning" className="d-inline">
            #<strong>#</strong>#
          </T>
        </div>
        {communityId && (
          <h5>
            {communityResp ? (
              <>
                <Link
                  className="text-body"
                  to={
                    communityLink(communityResp.community_view.community).link
                  }
                >
                  {communityLink(communityResp.community_view.community).link}
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
              <option value={"ModLockComment"}>Locking Comments</option>
              <option value={"ModFeaturePost"}>Featuring Posts</option>
              <option value={"ModRemoveComment"}>Removing Comments</option>
              <option value={"ModLockComment"}>Locking Comments</option>
              <option value={"AdminRemoveCommunity"}>
                Removing Communities
              </option>
              <option value={"ModBanFromCommunity"}>
                Banning From Communities
              </option>
              <option value={"ModAddToCommunity"}>
                Adding Mod to Community
              </option>
              <option value={"ModTransferCommunity"}>
                Transferring Communities
              </option>
              <option value={"ModChangeCommunityVisibility"}>
                Changing Community visibility
              </option>
              <option value={"AdminAdd"}>Adding Admin to Site</option>
              <option value={"AdminBlockInstance"}>
                Blocking a federated Instance
              </option>
              <option value={"AdminAllowInstance"}>
                Allowing a federated Instance
              </option>
              <option value={"AdminPurgePerson"}>Purging a Person</option>
              <option value={"AdminPurgeCommunity"}>Purging a Community</option>
              <option value={"AdminPurgePost"}>Purging a Post</option>
              <option value={"AdminPurgeComment"}>Purging a Comment</option>
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
          {this.amAdminOrMod && (
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
          <>
            <div id="modlog_table">
              <div className="row">
                <div className={`${TIME_COLS} fw-bold`}>
                  {I18NextService.i18n.t("time")}
                </div>
                <div className={`${MOD_COLS} fw-bold`}>
                  {I18NextService.i18n.t("mod")}
                </div>
                <div className={`${ACTION_COLS} fw-bold`}>
                  {I18NextService.i18n.t("action")}
                </div>
              </div>
              <TableHr />
              {this.combined}
            </div>
            <PaginatorCursor
              current={this.props.cursor}
              resource={this.state.res}
              onPageChange={this.handlePageChange}
            />
          </>
        );
      }
    }
  }

  get modlogItemsCount(): number {
    const { res } = this.state;

    return res.state === "success" ? res.data.modlog.length : 0;
  }

  handleFilterActionChange(i: Modlog, event: any) {
    i.updateUrl({
      actionType: event.target.value as ModlogActionType,
      cursor: undefined,
    });
  }

  handlePageChange(cursor?: DirectionalCursor) {
    this.updateUrl({ cursor });
  }

  handleUserChange(option: Choice) {
    this.updateUrl({
      userId: getIdFromString(option.value),
      cursor: undefined,
    });
  }

  handleModChange(option: Choice) {
    this.updateUrl({ modId: getIdFromString(option.value), cursor: undefined });
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
      cursor,
      userId,
      match: {
        params: { communityId },
      },
    } = { ...this.props, ...props };

    const queryParams: QueryParams<ModlogProps> = {
      cursor,
      actionType,
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
    const { actionType, cursor, modId, userId, postId, commentId } = props;
    const { communityId: urlCommunityId } = props.match.params;
    const communityId = getIdFromString(urlCommunityId);

    this.setState({ res: LOADING_REQUEST });
    const res = await HttpService.client.getModlog({
      community_id: communityId,
      limit: fetchLimit,
      type_: actionType,
      other_person_id: userId,
      mod_person_id: modId,
      comment_id: commentId,
      post_id: postId,
      ...cursorComponents(cursor),
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
    query: { cursor, userId, modId, actionType, commentId, postId },
    match: {
      params: { communityId: urlCommunityId },
    },
  }: InitialFetchRequest<ModlogPathProps, ModlogProps>): Promise<ModlogData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const communityId = getIdFromString(urlCommunityId);

    const modlogForm: GetModlog = {
      ...cursorComponents(cursor),
      limit: fetchLimit,
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
