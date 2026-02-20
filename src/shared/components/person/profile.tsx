import {
  commentViewToPersonContentCombinedView,
  editCombined,
  editPersonNotes,
  editPersonViewPersonNote,
  editPost,
  enableNsfw,
  getUncombinedPersonContent,
  postViewToPersonContentCombinedView,
  profileRSSUrl,
  reportToast,
  setIsoData,
  updateCommunityBlock,
  updatePersonBlock,
} from "@utils/app";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  capitalizeFirstLetter,
  getQueryParams,
  getQueryString,
  numToSI,
  resourcesSettled,
  bareRoutePush,
  getApubName,
} from "@utils/helpers";
import { amAdmin, canAdmin } from "@utils/roles";
import type { ItemIdAndRes, QueryParams } from "@utils/types";
import { itemLoading, RouteDataResponse } from "@utils/types";
import { format } from "date-fns";
import { NoOptionI18nKeys } from "i18next";
import { Component, FormEvent, InfernoMouseEvent } from "inferno";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanPerson,
  PersonResponse,
  BlockPerson,
  CommentResponse,
  Community,
  CommunityModeratorView,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  EditPost,
  FeaturePost,
  GetPersonDetailsResponse,
  GetSiteResponse,
  LemmyHttp,
  PagedResponse,
  LocalImageView,
  LockPost,
  PersonView,
  PostResponse,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  SuccessResponse,
  TransferCommunity,
  RegistrationApplicationResponse,
  MyUserInfo,
  CommunityId,
  PostCommentCombinedView,
  Person,
  MarkPostAsRead,
  SearchSortType,
  NotePerson,
  PostView,
  LockComment,
  BlockCommunity,
  MultiCommunityView,
  PaginationCursor,
  CommentId,
  PostId,
} from "lemmy-js-client";
import { fetchLimit, relTags } from "@utils/config";
import { InitialFetchRequest, PersonDetailsContentType } from "@utils/types";
import { mdToHtml } from "@utils/markdown";
import { FirstLoadService, I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
  wrapClient,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { BannerIconHeader } from "../common/banner-icon-header";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { SearchSortDropdown } from "../common/sort-dropdown";
import { UserBadges } from "../common/user-badges";
import { CommunityLink } from "../community/community-link";
import { PersonDetails } from "./person-details";
import { PersonListing } from "./person-listing";
import { getHttpBaseInternal } from "@utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { MediaUploads } from "../common/media-uploads";
import { cakeDate, futureDaysToUnixTime, nowBoolean } from "@utils/date";
import { isBrowser } from "@utils/browser";
import DisplayModal from "../common/modal/display-modal";
import { PaginatorCursor } from "@components/common/paginator-cursor";
import { MultiCommunityLink } from "@components/multi-community/multi-community-link";
import {
  FilterChipDropdown,
  FilterOption,
} from "@components/common/filter-chip-dropdown";
import { RouterContext } from "inferno-router/dist/Router";

type ProfileData = RouteDataResponse<{
  personRes: GetPersonDetailsResponse;
  personContentRes: PagedResponse<PostCommentCombinedView>;
  personSavedRes: PagedResponse<PostCommentCombinedView>;
  personLikedRes: PagedResponse<PostCommentCombinedView>;
  personReadRes: PagedResponse<PostView>;
  personHiddenRes: PagedResponse<PostView>;
  uploadsRes: PagedResponse<LocalImageView>;
}>;

interface ProfileState {
  personRes: RequestState<GetPersonDetailsResponse>;
  personContentRes: RequestState<PagedResponse<PostCommentCombinedView>>;
  personSavedRes: RequestState<PagedResponse<PostCommentCombinedView>>;
  personLikedRes: RequestState<PagedResponse<PostCommentCombinedView>>;
  personReadRes: RequestState<PagedResponse<PostView>>;
  personHiddenRes: RequestState<PagedResponse<PostView>>;
  uploadsRes: RequestState<PagedResponse<LocalImageView>>;
  registrationRes: RequestState<RegistrationApplicationResponse>;
  createCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  editCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  voteCommentRes: ItemIdAndRes<CommentId, CommentResponse>;
  votePostRes: ItemIdAndRes<PostId, PostResponse>;
  personBlocked: boolean;
  banReason?: string;
  banExpireDays?: number;
  showBanDialog: boolean;
  removeOrRestoreData: boolean;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
  showRegistrationDialog: boolean;
  pageBack?: boolean;
}

const contentTypeOptions: FilterOption<PersonDetailsContentType>[] = [
  { value: "all", i18n: "all" },
  { value: "comments", i18n: "comments" },
  { value: "posts", i18n: "posts" },
  { value: "uploads", i18n: "uploads" },
];

type ViewType = "saved" | "liked" | "read" | "hidden" | "all";
const viewTypeOptions: FilterOption<ViewType>[] = [
  { value: "all", i18n: "all" },
  { value: "saved", i18n: "saved" },
  { value: "liked", i18n: "liked" },
  { value: "read", i18n: "read" },
  { value: "hidden", i18n: "hidden" },
];

interface ProfileProps {
  contentType: PersonDetailsContentType;
  sort: SearchSortType;
  cursor?: PaginationCursor;
  viewType: ViewType;
}

export function getProfileQueryParams(source?: string): ProfileProps {
  return getQueryParams<ProfileProps>(
    {
      contentType: getContentTypeFromQuery,
      cursor: (cursor?: string) => cursor,
      sort: getSortTypeFromQuery,
      viewType: getViewTypeFromQuery,
    },
    source,
  );
}

function getSortTypeFromQuery(sort?: string): SearchSortType {
  return sort ? (sort as SearchSortType) : "new";
}

function getContentTypeFromQuery(
  contentType?: string,
): PersonDetailsContentType {
  switch (contentType) {
    case "uploads":
    case "all":
    case "posts":
    case "comments":
      return contentType;
    default:
      return "all";
  }
}

function getViewTypeFromQuery(viewType?: string): ViewType {
  switch (viewType) {
    case "all":
    case "saved":
    case "read":
    case "hidden":
    case "liked":
      return viewType;
    default:
      return "all";
  }
}

type CommunitiesListingProps = {
  translationKey: NoOptionI18nKeys;
  // TODO does this need to be destructured?
  communityViews?: { community: Community }[];
  myUserInfo?: MyUserInfo;
};
function CommunitiesListing({
  translationKey,
  communityViews,
  myUserInfo,
}: CommunitiesListingProps) {
  return (
    communityViews &&
    communityViews.length > 0 && (
      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h5">{I18NextService.i18n.t(translationKey)}</h2>
          <ul className="list-unstyled mb-0">
            {communityViews.map(({ community }) => (
              <li key={community.id}>
                <CommunityLink community={community} myUserInfo={myUserInfo} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  );
}

type ModeratesProps = {
  moderates?: CommunityModeratorView[];
  myUserInfo: MyUserInfo | undefined;
};
function Moderates({ moderates, myUserInfo }: ModeratesProps) {
  return (
    <CommunitiesListing
      translationKey="moderates"
      communityViews={moderates}
      myUserInfo={myUserInfo}
    />
  );
}

type FollowsProps = { myUserInfo: MyUserInfo | undefined };
function Follows({ myUserInfo }: FollowsProps) {
  return (
    <CommunitiesListing
      translationKey="subscribed"
      communityViews={myUserInfo?.follows}
      myUserInfo={myUserInfo}
    />
  );
}

type MultiCommunitiesProps = {
  multis?: MultiCommunityView[];
  myUserInfo?: MyUserInfo;
};
function MultiCommunities({ multis, myUserInfo }: MultiCommunitiesProps) {
  return (
    multis &&
    multis.length > 0 && (
      <div className="card mb-3">
        <div className="card-body">
          <h2 className="h5">{I18NextService.i18n.t("multi_communities")}</h2>
          <ul className="list-unstyled mb-0">
            {multis.map(m => (
              <li key={m.multi.id}>
                <MultiCommunityLink
                  multiCommunity={m.multi}
                  myUserInfo={myUserInfo}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  );
}

function isPersonBlocked(
  personRes: RequestState<GetPersonDetailsResponse>,
  myUserInfo: MyUserInfo | undefined,
) {
  return (
    (personRes.state === "success" &&
      myUserInfo?.person_blocks.some(
        ({ id }) => id === personRes.data.person_view.person.id,
      )) ??
    false
  );
}

function usernameIsPerson(username: string, person?: Person) {
  return person && [person.name, getApubName(person)].includes(username);
}

type ProfilePathProps = { username: string };
type ProfileRouteProps = RouteComponentProps<ProfilePathProps> & ProfileProps;
export type ProfileFetchConfig = IRoutePropsWithFetch<
  ProfileData,
  ProfilePathProps,
  ProfileProps
>;

@scrollMixin
export class Profile extends Component<ProfileRouteProps, ProfileState> {
  private isoData = setIsoData<ProfileData>(this.context);
  state: ProfileState = {
    personRes: EMPTY_REQUEST,
    personContentRes: EMPTY_REQUEST,
    personSavedRes: EMPTY_REQUEST,
    personLikedRes: EMPTY_REQUEST,
    personReadRes: EMPTY_REQUEST,
    personHiddenRes: EMPTY_REQUEST,
    uploadsRes: EMPTY_REQUEST,
    registrationRes: EMPTY_REQUEST,
    createCommentRes: { id: 0, res: EMPTY_REQUEST },
    editCommentRes: { id: 0, res: EMPTY_REQUEST },
    voteCommentRes: { id: 0, res: EMPTY_REQUEST },
    votePostRes: { id: 0, res: EMPTY_REQUEST },
    personBlocked: false,
    siteRes: this.isoData.siteRes,
    showBanDialog: false,
    removeOrRestoreData: false,
    isIsomorphic: false,
    showRegistrationDialog: false,
  };

  loadingSettled() {
    return resourcesSettled([this.state.personRes, this.currentRes]);
  }

  constructor(props: ProfileRouteProps, context: any) {
    super(props, context);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const personRes = this.isoData.routeData.personRes;
      const personContentRes = this.isoData.routeData.personContentRes;
      const personSavedRes = this.isoData.routeData.personSavedRes;
      const personLikedRes = this.isoData.routeData.personLikedRes;
      const personReadRes = this.isoData.routeData.personReadRes;
      const personHiddenRes = this.isoData.routeData.personHiddenRes;
      const uploadsRes = this.isoData.routeData.uploadsRes;

      this.state = {
        ...this.state,
        personRes,
        personContentRes,
        personSavedRes,
        personLikedRes,
        personReadRes,
        personHiddenRes,
        uploadsRes,
        isIsomorphic: true,
        personBlocked: isPersonBlocked(personRes, this.isoData.myUserInfo),
      };
    }
  }

  async componentWillMount() {
    if (!this.state.isIsomorphic && isBrowser()) {
      await this.fetchUserData(this.props, true);
    }
  }

  async componentWillReceiveProps(nextProps: ProfileRouteProps) {
    const reload = bareRoutePush(this.props, nextProps);

    const newUsername =
      nextProps.match.params.username !== this.props.match.params.username;

    if (
      nextProps.contentType !== this.props.contentType ||
      nextProps.sort !== this.props.sort ||
      nextProps.cursor !== this.props.cursor ||
      nextProps.viewType !== this.props.viewType ||
      newUsername ||
      reload
    ) {
      await this.fetchUserData(nextProps, reload || newUsername);
    }
  }

  fetchUserDataToken?: symbol;
  async fetchUserData(props_: ProfileRouteProps, showBothLoading = false) {
    const token = (this.fetchUserDataToken = Symbol());
    const {
      cursor,
      contentType: view,
      viewType: filter,
      match: { params: props },
    } = props_;
    const username = decodeURIComponent(props.username);
    const isMe = usernameIsPerson(
      username, // amCurrentUser would use the old username
      this.isoData.myUserInfo?.local_user_view.person,
    );

    const needPerson =
      this.state.personRes.state !== "success" || showBothLoading;
    const needUploads = isMe && view === "uploads";
    const needSaved = isMe && filter === "saved" && !needUploads;
    const needLiked = isMe && filter === "liked" && !needUploads;
    const needRead = isMe && filter === "read" && !needUploads;
    const needHidden = isMe && filter === "hidden" && !needUploads;
    const needContent =
      !needSaved && !needUploads && !needLiked && !needRead && !needHidden;

    const type_ = view === "uploads" ? undefined : view;

    this.setState(s => ({
      personRes: needPerson ? LOADING_REQUEST : s.personRes,
      personContentRes: LOADING_REQUEST,
      personSavedRes: LOADING_REQUEST,
      uploadsRes: LOADING_REQUEST,
    }));

    await Promise.all([
      needPerson &&
        HttpService.client.getPersonDetails({
          username,
        }),
      needContent &&
        HttpService.client.listPersonContent({
          type_,
          username,
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needSaved &&
        HttpService.client.listPersonSaved({
          type_,
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needUploads &&
        HttpService.client.listMedia({
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needLiked &&
        HttpService.client.listPersonLiked({
          page_cursor: cursor,
          limit: fetchLimit,
          type_,
        }),
      needRead &&
        HttpService.client.listPersonRead({
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needHidden &&
        HttpService.client.listPersonHidden({
          page_cursor: cursor,
          limit: fetchLimit,
        }),
    ]).then(args => {
      const [
        personRes,
        personContentRes,
        personSavedRes,
        uploadsRes,
        personLikedRes,
        personReadRes,
        personHiddenRes,
      ] = args;
      if (token === this.fetchUserDataToken) {
        this.setState(s => ({
          personRes: personRes || s.personRes,
          personContentRes: personContentRes || EMPTY_REQUEST,
          personSavedRes: personSavedRes || EMPTY_REQUEST,
          uploadsRes: uploadsRes || EMPTY_REQUEST,
          personBlocked: isPersonBlocked(s.personRes, this.isoData.myUserInfo),
          personLikedRes: personLikedRes || EMPTY_REQUEST,
          personReadRes: personReadRes || EMPTY_REQUEST,
          personHiddenRes: personHiddenRes || EMPTY_REQUEST,
        }));
      }
    });
  }

  get amCurrentUser() {
    return usernameIsPerson(
      this.props.match.params.username,
      this.isoData.myUserInfo?.local_user_view.person,
    );
  }

  static fetchInitialData = async ({
    headers,
    query: { contentType: view, cursor, viewType: filter },
    match: { params: props },
    myUserInfo,
  }: InitialFetchRequest<
    ProfilePathProps,
    ProfileProps
  >): Promise<ProfileData> => {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const username = decodeURIComponent(props.username);
    const isMe = usernameIsPerson(username, myUserInfo?.local_user_view.person);

    const needUploads = isMe && view === "uploads";
    const needSaved = isMe && filter === "saved" && !needUploads;
    const needLiked = isMe && filter === "liked" && !needUploads;
    const needRead = isMe && filter === "read" && !needUploads;
    const needHidden = isMe && filter === "hidden" && !needUploads;
    const needContent =
      !needUploads && !needSaved && !needLiked && !needRead && !needHidden;

    const type_ = view === "uploads" ? undefined : view;

    return await Promise.all([
      client.getPersonDetails({ username }),
      needContent &&
        client.listPersonContent({
          type_,
          username,
          page_cursor: cursor,
        }),
      needSaved &&
        client.listPersonSaved({
          type_,
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needUploads &&
        client.listMedia({ page_cursor: cursor, limit: fetchLimit }),
      needLiked &&
        client.listPersonLiked({
          type_,
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needRead &&
        client.listPersonRead({
          page_cursor: cursor,
          limit: fetchLimit,
        }),
      needHidden &&
        client.listPersonHidden({
          page_cursor: cursor,
          limit: fetchLimit,
        }),
    ]).then(args => {
      const [
        personRes,
        personContentRes,
        personSavedRes,
        uploadsRes,
        personLikedRes,
        personReadRes,
        personHiddenRes,
      ] = args;
      return {
        personRes: personRes || EMPTY_REQUEST,
        personContentRes: personContentRes || EMPTY_REQUEST,
        personSavedRes: personSavedRes || EMPTY_REQUEST,
        uploadsRes: uploadsRes || EMPTY_REQUEST,
        personLikedRes: personLikedRes || EMPTY_REQUEST,
        personReadRes: personReadRes || EMPTY_REQUEST,
        personHiddenRes: personHiddenRes || EMPTY_REQUEST,
      };
    });
  };

  get documentTitle(): string {
    const siteName = this.state.siteRes.site_view.site.name;
    const res = this.state.personRes;
    return res.state === "success"
      ? `@${res.data.person_view.person.name} - ${siteName}`
      : siteName;
  }

  renderUploadsRes() {
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
              uploads={uploadsRes}
              myUserInfo={this.isoData.myUserInfo}
            />
          </div>
        );
      }
    }
  }

  renderPersonRes() {
    switch (this.state.personRes.state) {
      case "loading":
        return (
          <h5>
            <Spinner large />
          </h5>
        );
      case "success": {
        const siteRes = this.state.siteRes;
        const personRes = this.state.personRes.data;
        const { sort, contentType: view, viewType: filter } = this.props;
        const myUserInfo = this.isoData.myUserInfo;

        const savedContent =
          (filter === "saved" &&
            this.state.personSavedRes.state === "success" &&
            this.state.personSavedRes.data.items) ||
          undefined;
        const content =
          (filter === "all" &&
            this.state.personContentRes.state === "success" &&
            this.state.personContentRes.data.items) ||
          undefined;
        const likedContent =
          (filter === "liked" &&
            this.state.personLikedRes.state === "success" &&
            this.state.personLikedRes.data.items) ||
          undefined;
        const readContent: PostCommentCombinedView[] | undefined =
          (filter === "read" &&
            this.state.personReadRes.state === "success" &&
            this.state.personReadRes.data.items.map(
              postViewToPersonContentCombinedView,
            )) ||
          undefined;
        const hiddenContent: PostCommentCombinedView[] | undefined =
          (filter === "hidden" &&
            this.state.personHiddenRes.state === "success" &&
            this.state.personHiddenRes.data.items.map(
              postViewToPersonContentCombinedView,
            )) ||
          undefined;
        const resState = this.currentRes.state;

        const isUpload = view === "uploads";

        const bio = !personRes.person_view.banned
          ? personRes.person_view.person.bio
          : "";

        return (
          <div className="row">
            <div className="col-12 col-md-8">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                canonicalPath={personRes.person_view.person.ap_id}
                description={bio}
                image={personRes.person_view.person.avatar}
              />

              {this.userInfo(personRes.person_view)}

              <hr />

              {this.selects}

              {isUpload && this.renderUploadsRes()}

              {!isUpload &&
                (resState === "loading" ? (
                  <h5>
                    <Spinner large />
                  </h5>
                ) : (
                  <PersonDetails
                    content={
                      savedContent ??
                      content ??
                      likedContent ??
                      readContent ??
                      hiddenContent ??
                      []
                    }
                    admins={siteRes.admins}
                    sort={sort}
                    limit={fetchLimit}
                    createCommentLoading={itemLoading(
                      this.state.createCommentRes,
                    )}
                    editCommentLoading={itemLoading(this.state.editCommentRes)}
                    voteCommentLoading={itemLoading(this.state.voteCommentRes)}
                    votePostLoading={itemLoading(this.state.votePostRes)}
                    enableNsfw={enableNsfw(siteRes)}
                    showAdultConsentModal={this.isoData.showAdultConsentModal}
                    myUserInfo={myUserInfo}
                    localSite={siteRes.site_view.local_site}
                    allLanguages={siteRes.all_languages}
                    siteLanguages={siteRes.discussion_languages}
                    onSaveComment={form => handleSaveComment(this, form)}
                    onBlockPerson={form =>
                      handleBlockPersonAlt(this, form, myUserInfo)
                    }
                    onBlockCommunity={form =>
                      handleBlockCommunity(form, myUserInfo)
                    }
                    onDeleteComment={form => handleDeleteComment(this, form)}
                    onRemoveComment={form => handleRemoveComment(this, form)}
                    onCommentVote={form => handleCommentVote(this, form)}
                    onCommentReport={form => handleCommentReport(form)}
                    onDistinguishComment={form =>
                      handleDistinguishComment(this, form)
                    }
                    onAddModToCommunity={form => handleAddModToCommunity(form)}
                    onAddAdmin={form => handleAddAdmin(this, form)}
                    onTransferCommunity={form => handleTransferCommunity(form)}
                    onPurgeComment={form => handlePurgeComment(this, form)}
                    onPurgePerson={form => handlePurgePerson(this, form)}
                    onBanPersonFromCommunity={form =>
                      handleBanFromCommunity(this, form)
                    }
                    onBanPerson={form => handleBanPerson(this, form)}
                    onCreateComment={form => handleCreateComment(this, form)}
                    onEditComment={form => handleEditComment(this, form)}
                    onPostEdit={form => handlePostEdit(this, form)}
                    onPostVote={form => handlePostVote(this, form)}
                    onPostReport={form => handlePostReport(form)}
                    onLockPost={form => handleLockPost(this, form)}
                    onDeletePost={form => handleDeletePost(this, form)}
                    onRemovePost={form => handleRemovePost(this, form)}
                    onSavePost={form => handleSavePost(this, form)}
                    onPurgePost={form => handlePurgePost(this, form)}
                    onFeaturePost={form => handleFeaturePost(this, form)}
                    onMarkPostAsRead={form =>
                      handleMarkPostAsRead(this, form, myUserInfo)
                    }
                    onPersonNote={form => handlePersonNote(this, form)}
                    onLockComment={form => handleLockComment(this, form)}
                    onFetchChildren={() => {}}
                  />
                ))}
              <PaginatorCursor
                current={this.props.cursor}
                resource={this.currentRes}
                onPageChange={cursor => handlePageChange(this, cursor)}
              />
            </div>

            <div className="col-12 col-md-4">
              <Moderates
                moderates={personRes.moderates}
                myUserInfo={this.isoData.myUserInfo}
              />
              {this.amCurrentUser && (
                <Follows myUserInfo={this.isoData.myUserInfo} />
              )}
              <MultiCommunities
                multis={personRes.multi_communities_created}
                myUserInfo={this.isoData.myUserInfo}
              />
            </div>
          </div>
        );
      }
    }
  }

  render() {
    return (
      <div className="person-profile container-lg">
        {this.renderPersonRes()}
      </div>
    );
  }

  get currentRes() {
    if (this.props.contentType === "uploads") {
      return this.state.uploadsRes;
    } else {
      switch (this.props.viewType) {
        case "saved":
          return this.state.personSavedRes;
        case "liked":
          return this.state.personLikedRes;
        case "read":
          return this.state.personReadRes;
        case "hidden":
          return this.state.personHiddenRes;
        case "all":
          return this.state.personContentRes;
      }
    }
  }

  get selects() {
    const { sort, viewType, contentType } = this.props;
    const { username } = this.props.match.params;

    const profileRss = profileRSSUrl(username, sort);

    let filteredContentTypeOptions = contentTypeOptions;

    // Hide uploads for others
    if (!this.amCurrentUser) {
      filteredContentTypeOptions = filteredContentTypeOptions.filter(
        o => "uploads" !== o.value,
      );
    }

    return (
      <div className="row row-cols-auto align-items-center g-3 mb-2">
        <div className="col">
          <FilterChipDropdown
            label={"type"}
            allOptions={filteredContentTypeOptions}
            currentOption={filteredContentTypeOptions.find(
              t => t.value === contentType,
            )}
            onSelect={val => handleContentTypeChange(this, val)}
          />
        </div>
        {this.amCurrentUser && (
          <div className="col">
            <FilterChipDropdown
              label={"view"}
              allOptions={viewTypeOptions}
              currentOption={viewTypeOptions.find(t => t.value === viewType)}
              onSelect={val => handleViewChange(this, val)}
            />
          </div>
        )}
        <div className="col">
          <SearchSortDropdown
            currentOption={sort}
            onSelect={val => handleSortChange(this, val)}
            showLabel
          />
        </div>
        {/* TODO: Rss feed for the Saved, Uploads, and Upvoted */}
        {viewType === "all" && (
          <div className="col">
            <a href={profileRss} rel={relTags} title="RSS">
              <Icon icon="rss" classes="text-muted small ps-0" />
            </a>
            <link
              rel="alternate"
              type="application/atom+xml"
              href={profileRss}
            />
          </div>
        )}
      </div>
    );
  }

  userInfo(pv: PersonView) {
    const {
      personBlocked,
      siteRes: { admins },
      showBanDialog,
      showRegistrationDialog,
      registrationRes,
    } = this.state;
    const myUserInfo = this.isoData.myUserInfo;

    return (
      pv && (
        <div>
          {!pv.banned && (
            <BannerIconHeader
              banner={pv.person.banner}
              icon={pv.person.avatar}
            />
          )}
          <div className="mb-3">
            <div className="">
              <div className="mb-0 d-flex flex-wrap">
                <div>
                  {pv.person.display_name && (
                    <h1 className="h4 mb-4">{pv.person.display_name}</h1>
                  )}
                  <ul className="list-inline mb-2">
                    <li className="list-inline-item">
                      <PersonListing
                        person={pv.person}
                        banned={pv.banned}
                        realLink
                        useApubName
                        muted
                        hideAvatar
                        myUserInfo={myUserInfo}
                      />
                    </li>
                    <li className="list-inline-item">
                      <UserBadges
                        classNames="ms-1"
                        isBanned={pv.banned}
                        isAdmin={pv.is_admin}
                        creator={pv.person}
                        myUserInfo={this.isoData.myUserInfo}
                        personActions={pv.person_actions}
                      />
                    </li>
                  </ul>
                </div>
                {this.banDialog(pv)}
                <div className="flex-grow-1 unselectable pointer mx-2"></div>
                {!this.amCurrentUser && this.isoData.myUserInfo && (
                  <>
                    {amAdmin(this.isoData.myUserInfo) && (
                      <Link
                        className={
                          "d-flex align-self-start btn btn-light border-light-subtle me-2"
                        }
                        to={`/modlog?userId=${pv.person.id}`}
                      >
                        {I18NextService.i18n.t("user_moderation_history", {
                          user: pv.person.name,
                        })}
                      </Link>
                    )}
                    {pv.person.matrix_user_id && (
                      <a
                        className={`d-flex align-self-start btn btn-light border-light-subtle me-2`}
                        rel={relTags}
                        href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                      >
                        {I18NextService.i18n.t("send_secure_message")}
                      </a>
                    )}
                    <Link
                      className={
                        "d-flex align-self-start btn btn-light border-light-subtle me-2"
                      }
                      to={`/create_private_message/${pv.person.id}`}
                    >
                      {I18NextService.i18n.t("send_message")}
                    </Link>
                    {personBlocked ? (
                      <button
                        className={
                          "d-flex align-self-start btn btn-light border-light-subtle me-2"
                        }
                        onClick={() =>
                          handleUnblockPerson(this, pv.person.id, myUserInfo)
                        }
                      >
                        {I18NextService.i18n.t("unblock_user")}
                      </button>
                    ) : (
                      <button
                        className={
                          "d-flex align-self-start btn btn-light border-light-subtle me-2"
                        }
                        onClick={() =>
                          handleBlockPerson(this, pv.person.id, myUserInfo)
                        }
                      >
                        {I18NextService.i18n.t("block_user")}
                      </button>
                    )}
                  </>
                )}

                {canAdmin(pv.person.id, admins, this.isoData.myUserInfo) &&
                  !pv.is_admin &&
                  !showBanDialog &&
                  (!pv.banned ? (
                    <button
                      className={
                        "d-flex align-self-start btn btn-light border-light-subtle me-2"
                      }
                      onClick={() => handleModBanShow(this)}
                      aria-label={I18NextService.i18n.t("ban")}
                    >
                      {capitalizeFirstLetter(I18NextService.i18n.t("ban"))}
                    </button>
                  ) : (
                    <button
                      className={
                        "d-flex align-self-start btn btn-light border-light-subtle me-2"
                      }
                      onClick={e => handleModBanSubmit(this, e)}
                      aria-label={I18NextService.i18n.t("unban")}
                    >
                      {capitalizeFirstLetter(I18NextService.i18n.t("unban"))}
                    </button>
                  ))}
                {amAdmin(myUserInfo) && pv.person.local && (
                  <>
                    <button
                      className={
                        "d-flex registration-self-start btn btn-light border-light-subtle me-2"
                      }
                      aria-label={I18NextService.i18n.t("view_registration")}
                      onClick={() => handleRegistrationShow(this)}
                    >
                      {I18NextService.i18n.t("view_registration")}
                    </button>
                    {showRegistrationDialog && (
                      <DisplayModal
                        onClose={() => handleRegistrationClose(this)}
                        loadingMessage={I18NextService.i18n.t(
                          "loading_registration",
                        )}
                        title={I18NextService.i18n.t("registration_for_user", {
                          name: pv.person.display_name ?? pv.person.name,
                        })}
                        show={showRegistrationDialog}
                        loading={registrationRes.state === "loading"}
                      >
                        {registrationRes.state === "success" ? (
                          <article
                            dangerouslySetInnerHTML={mdToHtml(
                              registrationRes.data.registration_application
                                .registration_application.answer,
                              () => this.forceUpdate(),
                            )}
                          />
                        ) : registrationRes.state === "failed" ? (
                          I18NextService.i18n.t("fetch_registration_error")
                        ) : (
                          ""
                        )}
                      </DisplayModal>
                    )}
                  </>
                )}
              </div>
              {pv.person.bio && (
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(pv.person.bio, () =>
                      this.forceUpdate(),
                    )}
                  />
                </div>
              )}
              <div>
                <ul className="list-inline mb-2">
                  <li className="list-inline-item badge text-bg-light">
                    {I18NextService.i18n.t("number_of_posts", {
                      count: Number(pv.person.post_count),
                      formattedCount: numToSI(pv.person.post_count),
                    })}
                  </li>
                  <li className="list-inline-item badge text-bg-light">
                    {I18NextService.i18n.t("number_of_comments", {
                      count: Number(pv.person.comment_count),
                      formattedCount: numToSI(pv.person.comment_count),
                    })}
                  </li>
                </ul>
              </div>
              <div className="text-muted">
                {I18NextService.i18n.t("joined")}{" "}
                <MomentTime
                  published={pv.person.published_at}
                  showAgo
                  ignoreUpdated
                />
              </div>
              <div className="d-flex align-items-center text-muted mb-2">
                <Icon icon="cake" />
                <span className="ms-2">
                  {I18NextService.i18n.t("cake_day_title")}{" "}
                  {format(cakeDate(pv.person.published_at), "PPP")}
                </span>
              </div>
              {!myUserInfo && (
                <div className="alert alert-info" role="alert">
                  {I18NextService.i18n.t("profile_not_logged_in_alert")}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  banDialog(pv: PersonView) {
    const { showBanDialog } = this.state;

    return (
      showBanDialog && (
        <form onSubmit={e => handleModBanSubmit(this, e)}>
          <div className="mb-3 row col-12">
            <label className="col-form-label" htmlFor="profile-ban-reason">
              {I18NextService.i18n.t("reason")}
            </label>
            <input
              type="text"
              id="profile-ban-reason"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("reason")}
              value={this.state.banReason}
              onInput={e => handleModBanReasonChange(this, e)}
              required
            />
            <label className="col-form-label" htmlFor="mod-ban-expires">
              {I18NextService.i18n.t("expires")}
            </label>
            <input
              type="number"
              id="mod-ban-expires"
              className="form-control me-2"
              placeholder={I18NextService.i18n.t("number_of_days")}
              value={this.state.banExpireDays}
              onInput={e => handleModBanExpireDaysChange(this, e)}
            />
            <div className="input-group mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="mod-ban-remove-data"
                  type="checkbox"
                  checked={this.state.removeOrRestoreData}
                  onChange={e => handleModRemoveDataChange(this, e)}
                />
                <label
                  className="form-check-label"
                  htmlFor="mod-ban-remove-data"
                  title={I18NextService.i18n.t("remove_content_more")}
                >
                  {I18NextService.i18n.t("remove_content")}
                </label>
              </div>
            </div>
          </div>
          {/* TODO hold off on expires until later */}
          {/* <div class="mb-3 row"> */}
          {/*   <label class="col-form-label">Expires</label> */}
          {/*   <input type="date" class="form-control me-2" placeholder={I18NextService.i18n.t('expires')} value={this.state.banExpires} onInput={(event) => this.handleModBanExpiresChange(this, event)} /> */}
          {/* </div> */}
          <div className="mb-3 row">
            <button
              type="reset"
              className="btn btn-light border-light-subtle me-2"
              aria-label={I18NextService.i18n.t("cancel")}
              onClick={() => handleModBanSubmitCancel(this)}
            >
              {I18NextService.i18n.t("cancel")}
            </button>
          </div>
          <div className="mb-3 row">
            <button
              type="submit"
              className="btn btn-light border-light-subtle"
              aria-label={I18NextService.i18n.t("ban")}
            >
              {I18NextService.i18n.t("ban", { name: pv.person.name })}
            </button>
          </div>
        </form>
      )
    );
  }

  updateUrl(props: Partial<ProfileRouteProps>) {
    const {
      cursor,
      sort,
      contentType: view,
      viewType: filter,
      match: {
        params: { username },
      },
    } = { ...this.props, ...props };

    const queryParams: QueryParams<ProfileProps> = {
      cursor,
      sort,
      contentType:
        view !== getContentTypeFromQuery(undefined) ? view : undefined,
      viewType: filter !== getViewTypeFromQuery(undefined) ? filter : undefined,
    };

    this.props.history.push(`/u/${username}${getQueryString(queryParams)}`);
  }

  maybeUpdatePerson(c: PersonView) {
    if (
      this.state.personRes.state !== "success" ||
      this.state.personRes.data.person_view.person.id !== c.person.id
    ) {
      return;
    }
    this.setState(s => {
      if (s.personRes.state !== "success") return { personRes: s.personRes };
      return {
        personRes: {
          ...s.personRes,
          data: {
            ...s.personRes.data,
            person_view: { ...c },
          },
        },
      };
    });
  }

  updateCurrentList(
    mapFn: (c: PostCommentCombinedView) => PostCommentCombinedView,
  ) {
    if (this.props.viewType === "saved") {
      this.setState(s => {
        if (s.personSavedRes.state === "success") {
          s.personSavedRes.data.items = s.personSavedRes.data.items.map(mapFn);
        }
        return { personSavedRes: s.personSavedRes };
      });
    } else if (this.props.viewType === "liked") {
      this.setState(s => {
        if (s.personLikedRes.state === "success") {
          s.personLikedRes.data.items = s.personLikedRes.data.items.map(mapFn);
        }
        return { personLikedRes: s.personLikedRes };
      });
    } else if (this.props.viewType === "read") {
      this.setState(s => {
        if (s.personReadRes.state === "success") {
          s.personReadRes.data.items = s.personReadRes.data.items
            .map(postViewToPersonContentCombinedView)
            .map(mapFn)
            .filter(c => c.type_ === "post");
        }
        return { personReadRes: s.personReadRes };
      });
    } else if (this.props.viewType === "hidden") {
      this.setState(s => {
        if (s.personHiddenRes.state === "success") {
          s.personHiddenRes.data.items = s.personHiddenRes.data.items
            .map(postViewToPersonContentCombinedView)
            .map(mapFn)
            .filter(c => c.type_ === "post");
        }
        return { personHiddenRes: s.personHiddenRes };
      });
    } else {
      this.setState(s => {
        if (s.personContentRes.state === "success") {
          s.personContentRes.data.items =
            s.personContentRes.data.items.map(mapFn);
        }
        return { personContentRes: s.personContentRes };
      });
    }
  }

  editCombinedCurrent(data: PostCommentCombinedView) {
    if (this.props.viewType === "saved") {
      this.setState(s => {
        if (s.personSavedRes.state === "success") {
          s.personSavedRes.data.items = editCombined(
            data,
            s.personSavedRes.data.items,
            getUncombinedPersonContent,
          );
        }
        return { personSavedRes: s.personSavedRes };
      });
    } else if (this.props.viewType === "liked") {
      this.setState(s => {
        if (s.personLikedRes.state === "success") {
          s.personLikedRes.data.items = editCombined(
            data,
            s.personLikedRes.data.items,
            getUncombinedPersonContent,
          );
        }
        return { personLikedRes: s.personLikedRes };
      });
    } else if (this.props.viewType === "read") {
      this.setState(s => {
        if (s.personReadRes.state === "success" && data.type_ === "post") {
          s.personReadRes.data.items = editPost(
            data,
            s.personReadRes.data.items,
          );
        }
        return { personReadRes: s.personReadRes };
      });
    } else if (this.props.viewType === "hidden") {
      this.setState(s => {
        if (s.personHiddenRes.state === "success" && data.type_ === "post") {
          s.personHiddenRes.data.items = editPost(
            data,
            s.personHiddenRes.data.items,
          );
        }
        return { personHiddenRes: s.personHiddenRes };
      });
    } else {
      this.setState(s => {
        if (s.personContentRes.state === "success") {
          s.personContentRes.data.items = editCombined(
            data,
            s.personContentRes.data.items,
            getUncombinedPersonContent,
          );
        }
        return { personContentRes: s.personContentRes };
      });
    }
  }

  updateBanFromCommunity(
    banRes: RequestState<PersonResponse>,
    communityId: CommunityId,
    banned: boolean,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.updateCurrentList(c =>
        c.creator.id === banRes.data.person_view.person.id &&
        c.community.id === communityId
          ? {
              ...c,
              creator_banned_from_community: banned,
            }
          : c,
      );
      this.maybeUpdatePerson(banRes.data.person_view);
    }
  }

  updateBan(banRes: RequestState<PersonResponse>, banned: boolean) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.updateCurrentList(c =>
        c.creator.id === banRes.data.person_view.person.id
          ? {
              ...c,
              creator_banned: banned,
            }
          : c,
      );
      this.maybeUpdatePerson(banRes.data.person_view);
    }
  }

  purgeItem(purgeRes: RequestState<SuccessResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      const context: RouterContext = this.context;
      context.router.history.push(`/`);
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    if (res.state === "success") {
      this.editCombinedCurrent(
        commentViewToPersonContentCombinedView(res.data.comment_view),
      );
    }
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.personContentRes.state === "success" && res.state === "success") {
        s.personContentRes.data.items.unshift(
          commentViewToPersonContentCombinedView(res.data.comment_view),
        );
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    if (res.state === "success") {
      this.editCombinedCurrent(
        postViewToPersonContentCombinedView(res.data.post_view),
      );
    }
  }
}

function handlePageChange(i: Profile, cursor?: PaginationCursor) {
  i.updateUrl({ cursor });
}

function handleSortChange(i: Profile, sort: SearchSortType) {
  i.updateUrl({ sort, cursor: undefined });
}

function handleContentTypeChange(
  i: Profile,
  contentType: PersonDetailsContentType,
) {
  if (contentType === "uploads") {
    i.updateUrl({
      contentType,
      cursor: undefined,
      viewType: undefined,
    });
  } else {
    i.updateUrl({ contentType, cursor: undefined });
  }
}

function handleViewChange(i: Profile, viewType: ViewType) {
  i.updateUrl({
    viewType,
    cursor: undefined,
  });
}

function handleModBanShow(i: Profile) {
  i.setState({ showBanDialog: true });
}

function handleModBanReasonChange(
  i: Profile,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ banReason: event.target.value });
}

function handleModBanExpireDaysChange(
  i: Profile,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ banExpireDays: Number(event.target.value) });
}

function handleModRemoveDataChange(
  i: Profile,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ removeOrRestoreData: event.target.checked });
}

function handleModBanSubmitCancel(i: Profile) {
  i.setState({ showBanDialog: false });
}

async function handleRegistrationShow(i: Profile) {
  if (i.state.registrationRes.state !== "success") {
    i.setState({ registrationRes: LOADING_REQUEST });
  }

  i.setState({ showRegistrationDialog: true });

  if (i.state.personRes.state === "success") {
    await HttpService.client
      .getRegistrationApplication({
        person_id: i.state.personRes.data.person_view.person.id,
      })
      .then(res => {
        i.setState({ registrationRes: res });

        if (res.state === "failed") {
          toast(I18NextService.i18n.t("fetch_registration_error"), "danger");
        }
      });
  }
}

function handleRegistrationClose(i: Profile) {
  i.setState({ showRegistrationDialog: false });
}

async function handleModBanSubmit(
  i: Profile,
  event: FormEvent<HTMLFormElement> | InfernoMouseEvent<HTMLButtonElement>,
) {
  event.preventDefault();
  const { banReason, banExpireDays } = i.state;

  const personRes = i.state.personRes;

  if (personRes.state === "success") {
    const person = personRes.data.person_view.person;
    const ban = !personRes.data.person_view.banned;

    // If its an unban, restore all their data
    if (!ban) {
      i.setState({ removeOrRestoreData: true });
    }

    const res = await HttpService.client.banPerson({
      person_id: person.id,
      ban,
      remove_or_restore_data: i.state.removeOrRestoreData,
      reason: banReason ?? "",
      expires_at: futureDaysToUnixTime(banExpireDays),
    });
    i.updateBan(res, ban);
    i.setState({ showBanDialog: false });
  }
}

async function handleToggleBlockPerson(
  i: Profile,
  recipientId: number,
  block: boolean,
  myUserInfo: MyUserInfo | undefined,
) {
  const res = await HttpService.client.blockPerson({
    person_id: recipientId,
    block,
  });
  if (res.state === "success") {
    updatePersonBlock(res.data, block, myUserInfo);
    i.setState({ personBlocked: block });
  }
}

async function handleUnblockPerson(
  i: Profile,
  personId: number,
  myUserInfo: MyUserInfo | undefined,
) {
  await handleToggleBlockPerson(i, personId, false, myUserInfo);
}

async function handleBlockPerson(
  i: Profile,
  personId: number,
  myUserInfo: MyUserInfo | undefined,
) {
  await handleToggleBlockPerson(i, personId, true, myUserInfo);
}

async function handleAddModToCommunity(form: AddModToCommunity) {
  // TODO not sure what to do here
  await HttpService.client.addModToCommunity(form);
}

async function handlePurgePerson(i: Profile, form: PurgePerson) {
  const purgePersonRes = await HttpService.client.purgePerson(form);
  i.purgeItem(purgePersonRes);
}

async function handlePurgeComment(i: Profile, form: PurgeComment) {
  const purgeCommentRes = await HttpService.client.purgeComment(form);
  i.purgeItem(purgeCommentRes);
}

async function handlePurgePost(i: Profile, form: PurgePost) {
  const purgeRes = await HttpService.client.purgePost(form);
  i.purgeItem(purgeRes);
}

async function handleBlockPersonAlt(
  i: Profile,
  form: BlockPerson,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockPersonRes = await HttpService.client.blockPerson(form);
  if (blockPersonRes.state === "success") {
    updatePersonBlock(blockPersonRes.data, form.block, myUserInfo);
    i.setState({ personBlocked: form.block });
  }
}

async function handleBlockCommunity(
  form: BlockCommunity,
  myUserInfo: MyUserInfo | undefined,
) {
  const blockCommunityRes = await HttpService.client.blockCommunity(form);
  if (blockCommunityRes.state === "success") {
    updateCommunityBlock(blockCommunityRes.data, form.block, myUserInfo);
  }
}

async function handleCreateComment(i: Profile, form: CreateComment) {
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res: LOADING_REQUEST,
    },
  });
  const res = await HttpService.client.createComment(form);
  i.setState({
    createCommentRes: {
      id: form.parent_id ?? 0,
      res,
    },
  });
  i.createAndUpdateComments(res);

  return res;
}

async function handleEditComment(i: Profile, form: EditComment) {
  i.setState({
    editCommentRes: { id: form.comment_id, res: LOADING_REQUEST },
  });

  const res = await HttpService.client.editComment(form);
  i.setState({
    editCommentRes: { id: form.comment_id, res },
  });

  i.findAndUpdateComment(res);

  return res;
}

async function handleDeleteComment(i: Profile, form: DeleteComment) {
  const deleteCommentRes = await HttpService.client.deleteComment(form);
  i.findAndUpdateComment(deleteCommentRes);
}

async function handleDeletePost(i: Profile, form: DeletePost) {
  const deleteRes = await HttpService.client.deletePost(form);
  i.findAndUpdatePost(deleteRes);
}

async function handleRemovePost(i: Profile, form: RemovePost) {
  const removeRes = await HttpService.client.removePost(form);
  i.findAndUpdatePost(removeRes);
}

async function handleRemoveComment(i: Profile, form: RemoveComment) {
  const removeCommentRes = await HttpService.client.removeComment(form);
  i.findAndUpdateComment(removeCommentRes);
}

async function handleLockComment(i: Profile, form: LockComment) {
  const res = await HttpService.client.lockComment(form);
  i.findAndUpdateComment(res);
}

async function handleSaveComment(i: Profile, form: SaveComment) {
  const saveCommentRes = await HttpService.client.saveComment(form);
  i.findAndUpdateComment(saveCommentRes);
}

async function handleSavePost(i: Profile, form: SavePost) {
  const saveRes = await HttpService.client.savePost(form);
  i.findAndUpdatePost(saveRes);
}

async function handleFeaturePost(i: Profile, form: FeaturePost) {
  const featureRes = await HttpService.client.featurePost(form);
  i.findAndUpdatePost(featureRes);
}

async function handleCommentVote(i: Profile, form: CreateCommentLike) {
  i.setState({ voteCommentRes: { id: form.comment_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likeComment(form);
  i.setState({ voteCommentRes: { id: form.comment_id, res } });

  i.findAndUpdateComment(res);
}

async function handlePostVote(i: Profile, form: CreatePostLike) {
  i.setState({ votePostRes: { id: form.post_id, res: LOADING_REQUEST } });
  const res = await HttpService.client.likePost(form);
  i.setState({ votePostRes: { id: form.post_id, res } });
  i.findAndUpdatePost(res);
  return res;
}

async function handlePostEdit(i: Profile, form: EditPost) {
  const res = await HttpService.client.editPost(form);
  i.findAndUpdatePost(res);
  return res;
}

async function handleCommentReport(form: CreateCommentReport) {
  const reportRes = await HttpService.client.createCommentReport(form);
  reportToast(reportRes);
}

async function handlePostReport(form: CreatePostReport) {
  const reportRes = await HttpService.client.createPostReport(form);
  reportToast(reportRes);
}

async function handleLockPost(i: Profile, form: LockPost) {
  const lockRes = await HttpService.client.lockPost(form);
  i.findAndUpdatePost(lockRes);
}

async function handleDistinguishComment(i: Profile, form: DistinguishComment) {
  const distinguishRes = await HttpService.client.distinguishComment(form);
  i.findAndUpdateComment(distinguishRes);
}

async function handleAddAdmin(i: Profile, form: AddAdmin) {
  const addAdminRes = await HttpService.client.addAdmin(form);

  if (addAdminRes.state === "success") {
    i.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
  }
}

async function handleTransferCommunity(form: TransferCommunity) {
  await HttpService.client.transferCommunity(form);
  toast(I18NextService.i18n.t("transfer_community"));
}

async function handlePersonNote(i: Profile, form: NotePerson) {
  const res = await HttpService.client.notePerson(form);

  i.setState(s => {
    if (s.personRes.state === "success" && res.state === "success") {
      s.personRes.data.person_view = editPersonViewPersonNote(
        form.note,
        form.person_id,
        s.personRes.data.person_view,
      );

      // Update the content lists
      if (s.personContentRes.state === "success") {
        s.personContentRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.personContentRes.data.items,
        );
      }
      if (s.personLikedRes.state === "success") {
        s.personLikedRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.personLikedRes.data.items,
        );
      }
      if (s.personReadRes.state === "success") {
        s.personReadRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.personReadRes.data.items,
        );
      }
      if (s.personHiddenRes.state === "success") {
        s.personHiddenRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.personHiddenRes.data.items,
        );
      }
      if (s.personSavedRes.state === "success") {
        s.personSavedRes.data.items = editPersonNotes(
          form.note,
          form.person_id,
          s.personSavedRes.data.items,
        );
      }
    }

    toast(I18NextService.i18n.t(form.note ? "note_created" : "note_deleted"));
    return s;
  });
}

async function handleMarkPostAsRead(
  i: Profile,
  form: MarkPostAsRead,
  myUserInfo: MyUserInfo | undefined,
) {
  const res = await HttpService.client.markPostAsRead(form);
  if (res.state === "success") {
    i.updateCurrentList(c => {
      if (c.type_ === "post" && c.post.id === form.post_id && myUserInfo) {
        if (!c.post_actions) {
          c.post_actions = {};
        }
        c.post_actions.read_at = nowBoolean(form.read);
      }
      return c;
    });
  }
}

async function handleBanFromCommunity(i: Profile, form: BanFromCommunity) {
  const banRes = await HttpService.client.banFromCommunity(form);
  i.updateBanFromCommunity(banRes, form.community_id, form.ban);
}

async function handleBanPerson(i: Profile, form: BanPerson) {
  const banRes = await HttpService.client.banPerson(form);
  i.updateBan(banRes, form.ban);
}
