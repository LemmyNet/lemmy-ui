import {
  communityToChoice,
  fetchCommunities,
  fetchUsers,
  personToChoice,
  setIsoData,
} from "@utils/app";
import {
  debounce,
  getIdFromString,
  getQueryParams,
  getQueryString,
  resourcesSettled,
  bareRoutePush,
} from "@utils/helpers";
import { formatRelativeDate } from "@utils/date";
import { scrollMixin } from "./mixins/scroll-mixin";
import { amAdmin, amMod } from "@utils/roles";
import type { QueryParams } from "@utils/types";
import { Choice, RouteDataResponse } from "@utils/types";
import { Component, InfernoNode } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  PagedResponse,
  ModlogView,
  GetPersonDetails,
  GetPersonDetailsResponse,
  LemmyHttp,
  MyUserInfo,
  Person,
  Modlog as Modlog_,
  PaginationCursor,
  ModlogKindFilter,
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
import { NoOptionI18nKeys } from "i18next";
import { ModlogKindFilterDropdown } from "./common/modlog-kind-filter-dropdown";

const TIME_COLS = "col-6 col-md-2";
const MOD_COLS = "col-6 col-md-4";
const ACTION_COLS = "col-12 col-md-6";

type FilterType = "mod" | "user" | "community";

type ModlogData = RouteDataResponse<{
  res: PagedResponse<ModlogView>;
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
      communityId: getIdFromString,
      cursor: (cursor?: string) => cursor,
    },
    source,
  );
}

interface ModlogState {
  res: RequestState<PagedResponse<ModlogView>>;
  communityRes: RequestState<GetCommunityResponse>;
  loadingModSearch: boolean;
  loadingUserSearch: boolean;
  loadingCommunitySearch: boolean;
  modSearchOptions: Choice[];
  userSearchOptions: Choice[];
  communitySearchOptions: Choice[];

  isIsomorphic: boolean;
}

interface ModlogProps {
  cursor?: PaginationCursor;
  userId?: number;
  modId?: number;
  actionType: ModlogKindFilter;
  postId?: number;
  commentId?: number;
  communityId?: number;
}

function getActionFromString(action?: string): ModlogKindFilter {
  return (action as ModlogKindFilter) ?? "all";
}

interface ModlogEntry {
  modlog: Modlog_;
  moderator?: Person;
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
              Post{" "}
              <Link to={`/post/${target_post?.id}`}>{target_post?.name}</Link>
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
  title,
  onChange,
  value,
  onSearch,
  options,
  loading,
}: {
  filterType: FilterType;
  title: NoOptionI18nKeys;
  onChange: (option: Choice) => void;
  value?: number | null;
  onSearch: (text: string) => void;
  options: Choice[];
  loading: boolean;
}) => (
  <SearchableSelect
    id={`filter-${filterType}`}
    value={value ?? 0}
    options={[
      {
        label: I18NextService.i18n.t(title) as string,
        value: "0",
      },
    ].concat(options)}
    onChange={onChange}
    onSearch={onSearch}
    loading={loading}
  />
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

type ModlogPathProps = Record<string, never>;
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
    loadingCommunitySearch: false,
    userSearchOptions: [],
    modSearchOptions: [],
    communitySearchOptions: [],
    isIsomorphic: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.res]);
  }

  constructor(props: ModlogRouteProps, context: any) {
    super(props, context);

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

      if (communityRes.state === "success") {
        this.state = {
          ...this.state,
          communitySearchOptions: [
            communityToChoice(communityRes.data.community_view),
          ],
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

  async componentWillReceiveProps(nextProps: ModlogRouteProps) {
    await this.fetchModlog(nextProps);

    const reload = bareRoutePush(this.props, nextProps);

    if (nextProps.modId !== this.props.modId || reload) {
      await this.fetchMod(nextProps);
    }
    if (nextProps.userId !== this.props.userId || reload) {
      await this.fetchUser(nextProps);
    }
    if (nextProps.communityId !== this.props.communityId || reload) {
      await this.fetchCommunity(nextProps);
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
    const combined = res.state === "success" ? res.data.items : [];
    const { myUserInfo } = this.isoData;

    return combined.map(i => {
      const {
        modlog: { published_at },
        moderator,
        data,
      } = processModlogEntry(i, myUserInfo);

      return (
        <>
          <div className="row">
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
      loadingCommunitySearch,
      userSearchOptions,
      modSearchOptions,
      communitySearchOptions,
    } = this.state;
    const { actionType, modId, userId, communityId } = this.props;

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
        <div className="row row-cols-auto align-items-center g-3 mb-2">
          <div className="col">
            <ModlogKindFilterDropdown
              currentOption={actionType}
              onSelect={val => handleFilterActionChange(this, val)}
            />
          </div>
          <div className="col">
            <Filter
              filterType="user"
              title="all_users"
              onChange={choice => handleUserChange(this, choice)}
              onSearch={text => handleSearchUsers(this, text)}
              value={userId}
              options={userSearchOptions}
              loading={loadingUserSearch}
            />
          </div>
          <div className="col">
            <Filter
              filterType="community"
              title="all_communities"
              onChange={choice => handleCommunityChange(this, choice)}
              onSearch={text => handleSearchCommunities(this, text)}
              value={communityId}
              options={communitySearchOptions}
              loading={loadingCommunitySearch}
            />
          </div>
          {this.amAdminOrMod && (
            <div className="col">
              <Filter
                filterType="mod"
                title="all_mods"
                onChange={choice => handleModChange(this, choice)}
                onSearch={text => handleSearchMods(this, text)}
                value={modId}
                options={modSearchOptions}
                loading={loadingModSearch}
              />
            </div>
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
              onPageChange={cursor => handlePageChange(this, cursor)}
            />
          </>
        );
      }
    }
  }

  get modlogItemsCount(): number {
    const { res } = this.state;

    return res.state === "success" ? res.data.items.length : 0;
  }

  updateUrl(props: Partial<ModlogProps>) {
    const { actionType, modId, cursor, userId, communityId } = {
      ...this.props,
      ...props,
    };

    const queryParams: QueryParams<ModlogProps> = {
      cursor,
      actionType,
      modId: modId?.toString(),
      userId: userId?.toString(),
      communityId: communityId?.toString(),
    };

    this.props.history.push(`/modlog${getQueryString(queryParams)}`);
  }

  fetchModlogToken?: symbol;
  async fetchModlog(props: ModlogRouteProps) {
    const token = (this.fetchModlogToken = Symbol());
    const {
      actionType,
      cursor,
      modId,
      userId,
      postId,
      commentId,
      communityId,
    } = props;

    this.setState({ res: LOADING_REQUEST });
    const res = await HttpService.client.getModlog({
      community_id: communityId,
      limit: fetchLimit,
      type_: actionType,
      other_person_id: userId,
      mod_person_id: modId,
      comment_id: commentId,
      post_id: postId,
      page_cursor: cursor,
    });

    if (token === this.fetchModlogToken) {
      this.setState({ res });
    }
  }

  fetchCommunityToken?: symbol;
  async fetchCommunity(props: ModlogRouteProps) {
    const token = (this.fetchCommunityToken = Symbol());
    const { communityId } = props;

    if (communityId) {
      this.setState({ communityRes: LOADING_REQUEST });
      const communityRes = await HttpService.client.getCommunity({
        id: communityId,
      });
      if (token === this.fetchCommunityToken) {
        this.setState({ communityRes });

        if (communityRes.state === "success") {
          this.setState({
            communitySearchOptions: [
              communityToChoice(communityRes.data.community_view),
            ],
          });
        }
      }
    } else {
      this.setState({ communityRes: EMPTY_REQUEST });
    }
  }

  static fetchInitialData = async ({
    headers,
    query: {
      cursor,
      userId,
      modId,
      actionType,
      commentId,
      postId,
      communityId,
    },
  }: InitialFetchRequest<
    ModlogPathProps,
    ModlogProps
  >): Promise<ModlogData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );

    const modlogForm: GetModlog = {
      page_cursor: cursor,
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
  };
}

function handleFilterActionChange(i: Modlog, actionType: ModlogKindFilter) {
  i.updateUrl({
    actionType,
    cursor: undefined,
  });
}

function handlePageChange(i: Modlog, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleUserChange(i: Modlog, option: Choice) {
  i.updateUrl({
    userId: getIdFromString(option.value),
    cursor: undefined,
  });
}

function handleCommunityChange(i: Modlog, option: Choice) {
  i.updateUrl({
    communityId: getIdFromString(option.value),
    cursor: undefined,
  });
}

function handleModChange(i: Modlog, option: Choice) {
  i.updateUrl({ modId: getIdFromString(option.value), cursor: undefined });
}

const handleSearchUsers = debounce(async (i: Modlog, text: string) => {
  if (!text.length) {
    return;
  }

  const { userId } = i.props;
  const { userSearchOptions } = i.state;
  i.setState({ loadingUserSearch: true });

  const newOptions = await createNewOptions({
    id: userId,
    text,
    oldOptions: userSearchOptions,
  });

  i.setState({
    userSearchOptions: newOptions,
    loadingUserSearch: false,
  });
});

const handleSearchCommunities = debounce(async (i: Modlog, text: string) => {
  if (!text.length) {
    return;
  }

  const { communityId } = i.props;
  const { communitySearchOptions } = i.state;
  i.setState({ loadingCommunitySearch: true });

  const newOptions = communitySearchOptions
    .filter(choice => parseInt(choice.value, 10) === communityId)
    .concat(
      (await fetchCommunities(text))
        .slice(0, fetchLimit)
        .map(communityToChoice),
    );

  i.setState({
    communitySearchOptions: newOptions,
    loadingCommunitySearch: false,
  });
});

const handleSearchMods = debounce(async (i: Modlog, text: string) => {
  if (!text.length) {
    return;
  }

  const { modId } = i.props;
  const { modSearchOptions } = i.state;
  i.setState({ loadingModSearch: true });

  const newOptions = await createNewOptions({
    id: modId,
    text,
    oldOptions: modSearchOptions,
  });

  i.setState({
    modSearchOptions: newOptions,
    loadingModSearch: false,
  });
});
