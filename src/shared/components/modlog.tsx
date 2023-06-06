import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AdminPurgeCommentView,
  AdminPurgeCommunityView,
  AdminPurgePersonView,
  AdminPurgePostView,
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  GetModlogResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  ModAddCommunityView,
  ModAddView,
  ModBanFromCommunityView,
  ModBanView,
  ModFeaturePostView,
  ModLockPostView,
  ModRemoveCommentView,
  ModRemoveCommunityView,
  ModRemovePostView,
  ModTransferCommunityView,
  ModlogActionType,
  Person,
} from "lemmy-js-client";
import moment from "moment";
import { i18n } from "../i18next";
import { InitialFetchRequest } from "../interfaces";
import {
  HttpService,
  RequestState,
  apiWrapperIso,
} from "../services/HttpService";
import {
  Choice,
  QueryParams,
  amAdmin,
  amMod,
  debounce,
  fetchLimit,
  fetchUsers,
  getIdFromString,
  getPageFromString,
  getQueryParams,
  getQueryString,
  getUpdatedSearchId,
  isInitialRoute,
  myAuth,
  personToChoice,
  setIsoData,
} from "../utils";
import { HtmlTags } from "./common/html-tags";
import { Icon, Spinner } from "./common/icon";
import { MomentTime } from "./common/moment-time";
import { Paginator } from "./common/paginator";
import { SearchableSelect } from "./common/searchable-select";
import { CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";

type FilterType = "mod" | "user";

type View =
  | ModRemovePostView
  | ModLockPostView
  | ModFeaturePostView
  | ModRemoveCommentView
  | ModRemoveCommunityView
  | ModBanFromCommunityView
  | ModBanView
  | ModAddCommunityView
  | ModTransferCommunityView
  | ModAddView
  | AdminPurgePersonView
  | AdminPurgeCommunityView
  | AdminPurgePostView
  | AdminPurgeCommentView;

interface ModlogType {
  id: number;
  type_: ModlogActionType;
  moderator?: Person;
  view: View;
  when_: string;
}

const getModlogQueryParams = () =>
  getQueryParams<ModlogProps>({
    actionType: getActionFromString,
    modId: getIdFromString,
    userId: getIdFromString,
    page: getPageFromString,
  });

interface ModlogState {
  res: RequestState<GetModlogResponse>;
  communityRes: RequestState<GetCommunityResponse>;
  loadingModSearch: boolean;
  loadingUserSearch: boolean;
  modSearchOptions: Choice[];
  userSearchOptions: Choice[];
}

interface ModlogProps {
  page: number;
  userId?: number | null;
  modId?: number | null;
  actionType: ModlogActionType;
}

function getActionFromString(action?: string): ModlogActionType {
  return action !== undefined ? (action as ModlogActionType) : "All";
}

const getModlogActionMapper =
  (
    actionType: ModlogActionType,
    getAction: (view: View) => { id: number; when_: string }
  ) =>
  (view: View & { moderator?: Person; admin?: Person }): ModlogType => {
    const { id, when_ } = getAction(view);

    return {
      id,
      type_: actionType,
      view,
      when_,
      moderator: view.moderator ?? view.admin,
    };
  };

function buildCombined({
  removed_comments,
  locked_posts,
  featured_posts,
  removed_communities,
  removed_posts,
  added,
  added_to_community,
  admin_purged_comments,
  admin_purged_communities,
  admin_purged_persons,
  admin_purged_posts,
  banned,
  banned_from_community,
  transferred_to_community,
}: GetModlogResponse): ModlogType[] {
  const combined = removed_posts
    .map(
      getModlogActionMapper(
        "ModRemovePost",
        ({ mod_remove_post }: ModRemovePostView) => mod_remove_post
      )
    )
    .concat(
      locked_posts.map(
        getModlogActionMapper(
          "ModLockPost",
          ({ mod_lock_post }: ModLockPostView) => mod_lock_post
        )
      )
    )
    .concat(
      featured_posts.map(
        getModlogActionMapper(
          "ModFeaturePost",
          ({ mod_feature_post }: ModFeaturePostView) => mod_feature_post
        )
      )
    )
    .concat(
      removed_comments.map(
        getModlogActionMapper(
          "ModRemoveComment",
          ({ mod_remove_comment }: ModRemoveCommentView) => mod_remove_comment
        )
      )
    )
    .concat(
      removed_communities.map(
        getModlogActionMapper(
          "ModRemoveCommunity",
          ({ mod_remove_community }: ModRemoveCommunityView) =>
            mod_remove_community
        )
      )
    )
    .concat(
      banned_from_community.map(
        getModlogActionMapper(
          "ModBanFromCommunity",
          ({ mod_ban_from_community }: ModBanFromCommunityView) =>
            mod_ban_from_community
        )
      )
    )
    .concat(
      added_to_community.map(
        getModlogActionMapper(
          "ModAddCommunity",
          ({ mod_add_community }: ModAddCommunityView) => mod_add_community
        )
      )
    )
    .concat(
      transferred_to_community.map(
        getModlogActionMapper(
          "ModTransferCommunity",
          ({ mod_transfer_community }: ModTransferCommunityView) =>
            mod_transfer_community
        )
      )
    )
    .concat(
      added.map(
        getModlogActionMapper("ModAdd", ({ mod_add }: ModAddView) => mod_add)
      )
    )
    .concat(
      banned.map(
        getModlogActionMapper("ModBan", ({ mod_ban }: ModBanView) => mod_ban)
      )
    )
    .concat(
      admin_purged_persons.map(
        getModlogActionMapper(
          "AdminPurgePerson",
          ({ admin_purge_person }: AdminPurgePersonView) => admin_purge_person
        )
      )
    )
    .concat(
      admin_purged_communities.map(
        getModlogActionMapper(
          "AdminPurgeCommunity",
          ({ admin_purge_community }: AdminPurgeCommunityView) =>
            admin_purge_community
        )
      )
    )
    .concat(
      admin_purged_posts.map(
        getModlogActionMapper(
          "AdminPurgePost",
          ({ admin_purge_post }: AdminPurgePostView) => admin_purge_post
        )
      )
    )
    .concat(
      admin_purged_comments.map(
        getModlogActionMapper(
          "AdminPurgeComment",
          ({ admin_purge_comment }: AdminPurgeCommentView) =>
            admin_purge_comment
        )
      )
    );

  // Sort them by time
  combined.sort((a, b) => b.when_.localeCompare(a.when_));

  return combined;
}

function renderModlogType({ type_, view }: ModlogType) {
  switch (type_) {
    case "ModRemovePost": {
      const mrpv = view as ModRemovePostView;
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
      } = view as ModLockPostView;

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
      } = view as ModFeaturePostView;

      return (
        <>
          <span>{featured ? "Featured " : "Unfeatured "}</span>
          <span>
            Post <Link to={`/post/${id}`}>{name}</Link>
          </span>
          <span>{is_featured_community ? " In Community" : " In Local"}</span>
        </>
      );
    }
    case "ModRemoveComment": {
      const mrc = view as ModRemoveCommentView;
      const {
        mod_remove_comment: { reason, removed },
        comment: { id, content },
        commenter,
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
      const mrco = view as ModRemoveCommunityView;
      const {
        mod_remove_community: { reason, expires, removed },
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
          {expires && (
            <span>
              <div>expires: {moment.utc(expires).fromNow()}</div>
            </span>
          )}
        </>
      );
    }

    case "ModBanFromCommunity": {
      const mbfc = view as ModBanFromCommunityView;
      const {
        mod_ban_from_community: { reason, expires, banned },
        banned_person,
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
              <div>expires: {moment.utc(expires).fromNow()}</div>
            </span>
          )}
        </>
      );
    }

    case "ModAddCommunity": {
      const {
        mod_add_community: { removed },
        modded_person,
        community,
      } = view as ModAddCommunityView;

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
      const { community, modded_person } = view as ModTransferCommunityView;

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
        banned_person,
      } = view as ModBanView;

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
              <div>expires: {moment.utc(expires).fromNow()}</div>
            </span>
          )}
        </>
      );
    }

    case "ModAdd": {
      const {
        mod_add: { removed },
        modded_person,
      } = view as ModAddView;

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
      } = view as AdminPurgePersonView;

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
      } = view as AdminPurgeCommunityView;

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
      } = view as AdminPurgePostView;

      return (
        <>
          <span>Purged a Post from from </span>
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
      } = view as AdminPurgeCommentView;

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

    default:
      return <></>;
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
  <div className="col-sm-6 form-group">
    <label className="col-form-label" htmlFor={`filter-${filterType}`}>
      {i18n.t(`filter_by_${filterType}` as NoOptionI18nKeys)}
    </label>
    <SearchableSelect
      id={`filter-${filterType}`}
      value={value ?? 0}
      options={[
        {
          label: i18n.t("all"),
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
  const newOptions: Choice[] = [];

  if (id) {
    const selectedUser = oldOptions.find(
      ({ value }) => value === id.toString()
    );

    if (selectedUser) {
      newOptions.push(selectedUser);
    }
  }

  if (text.length > 0) {
    newOptions.push(
      ...(await fetchUsers(text)).users
        .slice(0, Number(fetchLimit))
        .map<Choice>(personToChoice)
    );
  }

  return newOptions;
}

export class Modlog extends Component<
  RouteComponentProps<{ communityId?: string }>,
  ModlogState
> {
  private isoData = setIsoData(this.context);

  state: ModlogState = {
    res: { state: "empty" },
    communityRes: { state: "empty" },
    loadingModSearch: false,
    loadingUserSearch: false,
    userSearchOptions: [],
    modSearchOptions: [],
  };

  constructor(
    props: RouteComponentProps<{ communityId?: string }>,
    context: any
  ) {
    super(props, context);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleUserChange = this.handleUserChange.bind(this);
    this.handleModChange = this.handleModChange.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        res: apiWrapperIso(this.isoData.routeData[0] as GetModlogResponse),
      };

      const communityRes: GetCommunityResponse | undefined =
        this.isoData.routeData[1];

      if (communityRes) {
        // Getting the moderators
        this.state = {
          ...this.state,
          communityRes: apiWrapperIso(communityRes),
        };
      }

      const filteredModRes: GetPersonDetailsResponse | undefined =
        this.isoData.routeData[2];
      if (filteredModRes) {
        this.state = {
          ...this.state,
          modSearchOptions: [personToChoice(filteredModRes.person_view)],
        };
      }

      const filteredUserRes: GetPersonDetailsResponse | undefined =
        this.isoData.routeData[3];
      if (filteredUserRes) {
        this.state = {
          ...this.state,
          userSearchOptions: [personToChoice(filteredUserRes.person_view)],
        };
      }
    }
  }

  get combined() {
    const res = this.state.res;
    const combined = res.state == "success" ? buildCombined(res.data) : [];

    return (
      <tbody>
        {combined.map(i => (
          <tr key={i.id}>
            <td>
              <MomentTime published={i.when_} />
            </td>
            <td>
              {this.amAdminOrMod && i.moderator ? (
                <PersonListing person={i.moderator} />
              ) : (
                <div>{this.modOrAdminText(i.moderator)}</div>
              )}
            </td>
            <td>{renderModlogType(i)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  get amAdminOrMod(): boolean {
    const amMod_ =
      this.state.communityRes.state == "success" &&
      amMod(this.state.communityRes.data.moderators);
    return amAdmin() || amMod_;
  }

  modOrAdminText(person?: Person): string {
    return person &&
      this.isoData.site_res.admins.some(
        ({ person: { id } }) => id === person.id
      )
      ? i18n.t("admin")
      : i18n.t("mod");
  }

  get documentTitle(): string {
    return `Modlog - ${this.isoData.site_res.site_view.site.name}`;
  }

  render() {
    const {
      loadingModSearch,
      loadingUserSearch,
      userSearchOptions,
      modSearchOptions,
    } = this.state;
    const { actionType, modId, userId } = getModlogQueryParams();

    return (
      <div className="container-lg">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />

        <div>
          <div
            className="alert alert-warning text-sm-start text-xs-center"
            role="alert"
          >
            <Icon
              icon="alert-triangle"
              inline
              classes="mr-sm-2 mx-auto d-sm-inline d-block"
            />
            <T i18nKey="modlog_content_warning" class="d-inline">
              #<strong>#</strong>#
            </T>
          </div>
          {this.state.communityRes.state == "success" && (
            <h5>
              <Link
                className="text-body"
                to={`/c/${this.state.communityRes.data.community_view.community.name}`}
              >
                /c/{this.state.communityRes.data.community_view.community.name}{" "}
              </Link>
              <span>{i18n.t("modlog")}</span>
            </h5>
          )}
          <div className="form-row">
            <select
              value={actionType}
              onChange={linkEvent(this, this.handleFilterActionChange)}
              className="custom-select col-sm-6"
              aria-label="action"
            >
              <option disabled aria-hidden="true">
                {i18n.t("filter_by_action")}
              </option>
              <option value={"All"}>{i18n.t("all")}</option>
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
          <div className="form-row mb-2">
            <Filter
              filterType="user"
              onChange={this.handleUserChange}
              onSearch={this.handleSearchUsers}
              value={userId}
              options={userSearchOptions}
              loading={loadingUserSearch}
            />
            {!this.isoData.site_res.site_view.local_site
              .hide_modlog_mod_names && (
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
        const page = getModlogQueryParams().page;
        return (
          <div className="table-responsive">
            <table id="modlog_table" className="table table-sm table-hover">
              <thead className="pointer">
                <tr>
                  <th> {i18n.t("time")}</th>
                  <th>{i18n.t("mod")}</th>
                  <th>{i18n.t("action")}</th>
                </tr>
              </thead>
              {this.combined}
            </table>
            <Paginator page={page} onChange={this.handlePageChange} />
          </div>
        );
      }
    }
  }

  handleFilterActionChange(i: Modlog, event: any) {
    i.updateUrl({
      actionType: event.target.value as ModlogActionType,
      page: 1,
    });
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleUserChange(option: Choice) {
    this.updateUrl({ userId: getIdFromString(option.value) ?? null, page: 1 });
  }

  handleModChange(option: Choice) {
    this.updateUrl({ modId: getIdFromString(option.value) ?? null, page: 1 });
  }

  handleSearchUsers = debounce(async (text: string) => {
    const { userId } = getModlogQueryParams();
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
    const { modId } = getModlogQueryParams();
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

  async updateUrl({ actionType, modId, page, userId }: Partial<ModlogProps>) {
    const {
      page: urlPage,
      actionType: urlActionType,
      modId: urlModId,
      userId: urlUserId,
    } = getModlogQueryParams();

    const queryParams: QueryParams<ModlogProps> = {
      page: (page ?? urlPage).toString(),
      actionType: actionType ?? urlActionType,
      modId: getUpdatedSearchId(modId, urlModId),
      userId: getUpdatedSearchId(userId, urlUserId),
    };

    const communityId = this.props.match.params.communityId;

    this.props.history.push(
      `/modlog${communityId ? `/${communityId}` : ""}${getQueryString(
        queryParams
      )}`
    );

    await this.refetch();
  }

  async refetch() {
    const auth = myAuth();
    const { actionType, page, modId, userId } = getModlogQueryParams();
    const { communityId: urlCommunityId } = this.props.match.params;
    const communityId = getIdFromString(urlCommunityId);

    this.setState({ res: { state: "loading" } });
    this.setState({
      res: await HttpService.wrappedClient.getModlog({
        community_id: communityId,
        page,
        limit: fetchLimit,
        type_: actionType,
        other_person_id: userId ?? undefined,
        mod_person_id: !this.isoData.site_res.site_view.local_site
          .hide_modlog_mod_names
          ? modId ?? undefined
          : undefined,
        auth,
      }),
    });

    if (communityId) {
      this.setState({ communityRes: { state: "loading" } });
      this.setState({
        communityRes: await HttpService.wrappedClient.getCommunity({
          id: communityId,
          auth,
        }),
      });
    }
  }

  static fetchInitialData({
    client,
    path,
    query: { modId: urlModId, page, userId: urlUserId, actionType },
    auth,
    site,
  }: InitialFetchRequest<QueryParams<ModlogProps>>): Promise<any>[] {
    const pathSplit = path.split("/");
    const promises: Promise<any>[] = [];
    const communityId = getIdFromString(pathSplit[2]);
    const modId = !site.site_view.local_site.hide_modlog_mod_names
      ? getIdFromString(urlModId)
      : undefined;
    const userId = getIdFromString(urlUserId);

    const modlogForm: GetModlog = {
      page: getPageFromString(page),
      limit: fetchLimit,
      community_id: communityId,
      type_: getActionFromString(actionType),
      mod_person_id: modId,
      other_person_id: userId,
      auth,
    };

    promises.push(client.getModlog(modlogForm));

    if (communityId) {
      const communityForm: GetCommunity = {
        id: communityId,
        auth,
      };
      promises.push(client.getCommunity(communityForm));
    } else {
      promises.push(Promise.resolve());
    }

    if (modId) {
      const getPersonForm: GetPersonDetails = {
        person_id: modId,
        auth,
      };

      promises.push(client.getPersonDetails(getPersonForm));
    } else {
      promises.push(Promise.resolve());
    }

    if (userId) {
      const getPersonForm: GetPersonDetails = {
        person_id: userId,
        auth,
      };

      promises.push(client.getPersonDetails(getPersonForm));
    } else {
      promises.push(Promise.resolve());
    }

    return promises;
  }
}
