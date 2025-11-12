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
import { formatRelativeDate } from "@utils/date";
import { scrollMixin } from "./mixins/scroll-mixin";
import { amAdmin, amMod } from "@utils/roles";
import type { DirectionalCursor, QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode, linkEvent } from "inferno";
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
  ModlogKind,
  ModlogView,
  MyUserInfo,
  Person,
  Modlog as Modlog_,
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
  actionType?: ModlogKind;
  postId?: number;
  commentId?: number;
}

function getActionFromString(action?: string): ModlogKind | undefined {
  return action as ModlogKind;
}

interface ModlogEntry {
  modlog: Modlog_;
  moderator: Person | null;
  data: InfernoNode;
}

export function processModlogEntry(
  view: ModlogView,
  myUserInfo: MyUserInfo | undefined,
): ModlogEntry {
  const modlog = view.modlog;
  const { id, reason, is_revert, expires_at } = modlog;

  // The target fields are all optional, however the backend validates that they are not null
  // for a given type. For example if `kind == mod_remove_comment` then target_comment can
  // never be null. In general if a field is not null during testing for a given type, you
  // can rely on the fact that it will never be null in production for the same type.
  const {
    moderator,
    target_instance,
    target_comment,
    target_community,
    target_person,
    target_post,
  } = view;

  switch (view.modlog.kind) {
    case "admin_allow_instance": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>Allowed instance</span>
            <span>{target_instance?.domain}</span>
          </>
        ),
      };
    }

    case "admin_block_instance": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>Blocked Instance</span>
            <span>{target_instance?.domain}</span>
          </>
        ),
      };
    }

    case "admin_purge_comment": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>
              Purged a Comment from{" "}
              <Link to={`/post/${id}`}>{target_post?.name}</Link>
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

    case "admin_purge_community": {
      return {
        modlog,
        moderator,
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

    case "admin_purge_person": {
      return {
        modlog,
        moderator,
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

    case "admin_purge_post": {
      return {
        modlog,
        moderator,
        data: target_community && (
          <>
            <span>Purged Post From</span>
            <CommunityLink
              community={target_community}
              myUserInfo={myUserInfo}
            />
            {reason && (
              <span>
                <div>reason: {reason}</div>
              </span>
            )}
          </>
        ),
      };
    }

    case "admin_add": {
      return {
        modlog,
        moderator,
        data: target_person && (
          <>
            <span>{is_revert ? "Appointed " : "Removed "}</span>
            <span>
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={false}
              />
            </span>
            <span> as an admin </span>
          </>
        ),
      };
    }

    case "mod_add_to_community": {
      return {
        modlog,
        moderator,
        data: target_person && target_community && (
          <>
            <span>{is_revert ? "Appointed " : "Removed "}</span>
            <span>
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={false}
              />
            </span>
            <span> as a mod to the community </span>
            <span>
              <CommunityLink
                community={target_community}
                myUserInfo={myUserInfo}
              />
            </span>
          </>
        ),
      };
    }

    case "admin_ban": {
      return {
        modlog,
        moderator,
        data: target_person && (
          <>
            <span>{is_revert ? "Unbanned " : "Banned "}</span>
            <span>
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={!is_revert}
              />
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

    case "mod_ban_from_community": {
      return {
        modlog,
        moderator,
        data: target_person && target_community && (
          <>
            <span>{is_revert ? "Unbanned " : "Banned "}</span>
            <span>
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={!is_revert}
              />
            </span>
            <span> from the community </span>
            <span>
              <CommunityLink
                community={target_community}
                myUserInfo={myUserInfo}
              />
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

    case "mod_change_community_visibility": {
      return {
        modlog,
        moderator,
        data: target_community && (
          <>
            <span>Change visibility of</span>
            <span>
              <CommunityLink
                community={target_community}
                myUserInfo={myUserInfo}
              />
            </span>
          </>
        ),
      };
    }

    case "mod_feature_post_community": {
      return {
        modlog,
        moderator,
        data: target_community && (
          <>
            <span>{is_revert ? "Unfeatured " : "Featured "}</span>
            <span>
              Post <Link to={`/post/${target_post?.id}`}>{name}</Link>
            </span>
            <span>" in community "</span>
            <CommunityLink
              community={target_community}
              myUserInfo={myUserInfo}
            />
          </>
        ),
      };
    }

    case "admin_feature_post_site": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>{is_revert ? "Unfeatured " : "Featured "}</span>
            <span>
              Post{" "}
              <Link to={`/post/${target_post?.id}`}>{target_post?.name}</Link>
            </span>
          </>
        ),
      };
    }

    case "mod_lock_post": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>{is_revert ? "Unlocked " : "Locked "}</span>
            <span>
              Post{" "}
              <Link to={`/post/${target_post?.id}`}>{target_post?.name}</Link>
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

    case "mod_remove_comment": {
      return {
        modlog,
        moderator,
        data: target_person && (
          <>
            <span>{is_revert ? "Restored " : "Removed "}</span>
            <span>
              Comment{" "}
              <Link to={`/comment/${target_comment?.id}`}>
                {target_comment?.content}
              </Link>
            </span>
            <span>
              {" "}
              by{" "}
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={false}
              />
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

    case "mod_lock_comment": {
      return {
        modlog,
        moderator,
        data: target_person && (
          <>
            <span>{is_revert ? "Unlocked " : "Locked "}</span>
            <span>
              Comment{" "}
              <Link to={`/comment/${target_comment?.id}`}>
                {target_comment?.content}
              </Link>
            </span>
            <span>
              {" "}
              by{" "}
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={false}
              />
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

    case "admin_remove_community": {
      return {
        modlog,
        moderator,
        data: target_community && (
          <>
            <span>{is_revert ? "Restored " : "Removed "}</span>
            <span>
              Community{" "}
              <CommunityLink
                community={target_community}
                myUserInfo={myUserInfo}
              />
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

    case "mod_remove_post": {
      return {
        modlog,
        moderator,
        data: (
          <>
            <span>{is_revert ? "Restored " : "Removed "}</span>
            <span>
              Post{" "}
              <Link to={`/post/${target_post?.id}`}>{target_post?.name}</Link>
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

    case "mod_transfer_community": {
      return {
        modlog,
        moderator,
        data: target_community && target_person && (
          <>
            <span>Transferred</span>
            <span>
              <CommunityLink
                community={target_community}
                myUserInfo={myUserInfo}
              />
            </span>
            <span> to </span>
            <span>
              <PersonListing
                person={target_person}
                myUserInfo={myUserInfo}
                banned={false}
              />
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
      const {
        modlog: { id, published_at },
        moderator,
        data,
      } = processModlogEntry(i, myUserInfo);

      return (
        <>
          <div className="row" key={id}>
            <div className={TIME_COLS}>
              <MomentTime published={published_at} />
            </div>
            <div className={MOD_COLS}>
              {this.amAdminOrMod && moderator ? (
                <PersonListing
                  person={moderator}
                  myUserInfo={myUserInfo}
                  banned={false}
                />
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

  modOrAdminText(person: Person | null): string {
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
              <option value={"all"}>{I18NextService.i18n.t("all")}</option>
              <option value={"mod_remove_post"}>Removing Posts</option>
              <option value={"mod_lock_post"}>Locking Posts</option>
              <option value={"mod_lock_comment"}>Locking Comments</option>
              <option value={"mod_feature_post_community"}>
                Featuring Posts in Community
              </option>
              <option value={"admin_feature_post_site"}>
                Featuring Posts for local Instance
              </option>
              <option value={"mod_remove_comment"}>Removing Comments</option>
              <option value={"admin_remove_community"}>
                Removing Communities
              </option>
              <option value={"admin_ban"}>Banning From Site</option>
              <option value={"mod_ban_from_community"}>
                Banning From Communities
              </option>
              <option value={"mod_add_to_community"}>
                Adding Mod to Community
              </option>
              <option value={"mod_transfer_community"}>
                Transferring Communities
              </option>
              <option value={"mod_change_community_visibility"}>
                Changing Community visibility
              </option>
              <option value={"admin_add"}>Adding Admin to Site</option>
              <option value={"admin_block_instance"}>
                Blocking a federated Instance
              </option>
              <option value={"admin_allow_instance"}>
                Allowing a federated Instance
              </option>
              <option value={"admin_purge_person"}>Purging a Person</option>
              <option value={"admin_purge_community"}>
                Purging a Community
              </option>
              <option value={"admin_purge_post"}>Purging a Post</option>
              <option value={"admin_purge_comment"}>Purging a Comment</option>
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
    let val = event.target.value;
    if (val === "all") {
      val = undefined;
    }
    i.updateUrl({
      actionType: val as ModlogKind,
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
