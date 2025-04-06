import {
  editCombined,
  enableDownvotes,
  enableNsfw,
  getUncombinedPersonContent,
  setIsoData,
  updatePersonBlock,
} from "@utils/app";
import { scrollMixin } from "../mixins/scroll-mixin";
import {
  capitalizeFirstLetter,
  getQueryParams,
  getQueryString,
  numToSI,
  randomStr,
  resourcesSettled,
  bareRoutePush,
  getApubName,
} from "@utils/helpers";
import { amAdmin, canAdmin } from "@utils/roles";
import type { QueryParams } from "@utils/types";
import { RouteDataResponse } from "@utils/types";
import classNames from "classnames";
import { format } from "date-fns";
import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdmin,
  AddModToCommunity,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
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
  ListMediaResponse,
  ListPersonContentResponse,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonCommentMentionAsRead,
  PersonView,
  PostResponse,
  PurgeComment,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  PostSortType,
  SuccessResponse,
  TransferCommunity,
  RegistrationApplicationResponse,
  MyUserInfo,
  PaginationCursor,
  CommunityId,
  ListPersonSavedResponse,
  PersonContentCombinedView,
  Person,
  MarkPostAsRead,
} from "lemmy-js-client";
import { fetchLimit, relTags } from "@utils/config";
import { InitialFetchRequest, PersonDetailsView } from "@utils/types";
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
import { PostSortSelect } from "../common/sort-select";
import { UserBadges } from "../common/user-badges";
import { CommunityLink } from "../community/community-link";
import { PersonDetails } from "./person-details";
import { PersonListing } from "./person-listing";
import { getHttpBaseInternal } from "../../utils/env";
import { IRoutePropsWithFetch } from "@utils/routes";
import { MediaUploads } from "../common/media-uploads";
import { cakeDate, futureDaysToUnixTime, nowBoolean } from "@utils/date";
import { isBrowser } from "@utils/browser";
import DisplayModal from "../common/modal/display-modal";
import { Paginator } from "../common/paginator";

type ProfileData = RouteDataResponse<{
  personRes: GetPersonDetailsResponse;
  personContentRes: ListPersonContentResponse;
  personSavedRes: ListPersonSavedResponse;
  uploadsRes: ListMediaResponse;
}>;

interface ProfileState {
  personRes: RequestState<GetPersonDetailsResponse>;
  personContentRes: RequestState<ListPersonContentResponse>;
  personSavedRes: RequestState<ListPersonSavedResponse>;
  uploadsRes: RequestState<ListMediaResponse>;
  registrationRes: RequestState<RegistrationApplicationResponse>;
  personBlocked: boolean;
  banReason?: string;
  banExpireDays?: number;
  showBanDialog: boolean;
  removeOrRestoreData: boolean;
  siteRes: GetSiteResponse;
  isIsomorphic: boolean;
  showRegistrationDialog: boolean;
}

interface ProfileProps {
  view: PersonDetailsView;
  sort: PostSortType;
  page: PaginationCursor | undefined;
  saved: boolean;
}

export function getProfileQueryParams(source?: string): ProfileProps {
  return getQueryParams<ProfileProps>(
    {
      view: getViewFromProps,
      page: (arg?: string) => arg,
      sort: getSortTypeFromQuery,
      saved: (arg?: string) => arg === "true",
    },
    source,
  );
}

function getSortTypeFromQuery(sort?: string): PostSortType {
  return sort ? (sort as PostSortType) : "New";
}

function getViewFromProps(view?: string): PersonDetailsView {
  switch (view) {
    case "Uploads":
    case "All":
    case "Posts":
    case "Comments":
      return view;
    default:
      return "All";
  }
}

const getCommunitiesListing = (
  translationKey: NoOptionI18nKeys,
  communityViews?: { community: Community }[],
) =>
  communityViews &&
  communityViews.length > 0 && (
    <div className="card border-secondary mb-3">
      <div className="card-body">
        <h2 className="h5">{I18NextService.i18n.t(translationKey)}</h2>
        <ul className="list-unstyled mb-0">
          {communityViews.map(({ community }) => (
            <li key={community.id}>
              <CommunityLink community={community} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

const Moderates = ({ moderates }: { moderates?: CommunityModeratorView[] }) =>
  getCommunitiesListing("moderates", moderates);

const Follows = ({ myUserInfo }: { myUserInfo?: MyUserInfo }) =>
  getCommunitiesListing("subscribed", myUserInfo?.follows);

function isPersonBlocked(
  personRes: RequestState<GetPersonDetailsResponse>,
  myUserInfo?: MyUserInfo,
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
    uploadsRes: EMPTY_REQUEST,
    personBlocked: false,
    siteRes: this.isoData.siteRes,
    showBanDialog: false,
    removeOrRestoreData: false,
    isIsomorphic: false,
    showRegistrationDialog: false,
    registrationRes: EMPTY_REQUEST,
  };

  loadingSettled() {
    return resourcesSettled([
      this.state.personRes,
      this.props.view === "Uploads"
        ? this.state.uploadsRes
        : this.props.saved
          ? this.state.personSavedRes
          : this.state.personContentRes,
    ]);
  }

  constructor(props: ProfileRouteProps, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageNumberChange = this.handlePageNumberChange.bind(this);

    this.handleBlockPerson = this.handleBlockPerson.bind(this);
    this.handleUnblockPerson = this.handleUnblockPerson.bind(this);

    this.handleCreateComment = this.handleCreateComment.bind(this);
    this.handleEditComment = this.handleEditComment.bind(this);
    this.handleSaveComment = this.handleSaveComment.bind(this);
    this.handleBlockPersonAlt = this.handleBlockPersonAlt.bind(this);
    this.handleDeleteComment = this.handleDeleteComment.bind(this);
    this.handleRemoveComment = this.handleRemoveComment.bind(this);
    this.handleCommentVote = this.handleCommentVote.bind(this);
    this.handleAddModToCommunity = this.handleAddModToCommunity.bind(this);
    this.handleAddAdmin = this.handleAddAdmin.bind(this);
    this.handlePurgePerson = this.handlePurgePerson.bind(this);
    this.handlePurgeComment = this.handlePurgeComment.bind(this);
    this.handleCommentReport = this.handleCommentReport.bind(this);
    this.handleDistinguishComment = this.handleDistinguishComment.bind(this);
    this.handleTransferCommunity = this.handleTransferCommunity.bind(this);
    this.handleCommentReplyRead = this.handleCommentReplyRead.bind(this);
    this.handlePersonMentionRead = this.handlePersonMentionRead.bind(this);
    this.handleMarkPostAsRead = this.handleMarkPostAsRead.bind(this);
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostEdit = this.handlePostEdit.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePost = this.handleFeaturePost.bind(this);
    this.handleModBanSubmit = this.handleModBanSubmit.bind(this);
    this.handleRegistrationShow = this.handleRegistrationShow.bind(this);
    this.handleRegistrationClose = this.handleRegistrationClose.bind(this);

    // Only fetch the data if coming from another route
    if (FirstLoadService.isFirstLoad) {
      const personRes = this.isoData.routeData.personRes;
      const personContentRes = this.isoData.routeData.personContentRes;
      const personSavedRes = this.isoData.routeData.personSavedRes;
      const uploadsRes = this.isoData.routeData.uploadsRes;
      this.state = {
        ...this.state,
        personRes,
        personContentRes,
        personSavedRes,
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

  componentWillReceiveProps(nextProps: ProfileRouteProps) {
    const reload = bareRoutePush(this.props, nextProps);

    const newUsername =
      nextProps.match.params.username !== this.props.match.params.username;

    if (
      nextProps.view !== this.props.view ||
      nextProps.sort !== this.props.sort ||
      nextProps.page !== this.props.page ||
      nextProps.saved !== this.props.saved ||
      newUsername ||
      reload
    ) {
      this.fetchUserData(nextProps, reload || newUsername);
    }
  }

  fetchUserDataToken?: symbol;
  async fetchUserData(props: ProfileRouteProps, showBothLoading = false) {
    const token = (this.fetchUserDataToken = Symbol());
    const {
      page,
      view,
      saved,
      match: {
        params: { username },
      },
    } = props;
    const isMe = usernameIsPerson(
      username, // amCurrentUser would use the old username
      this.isoData.myUserInfo?.local_user_view.person,
    );

    const needPerson =
      this.state.personRes.state !== "success" || showBothLoading;
    const needUploads = isMe && view === "Uploads";
    const needSaved = isMe && saved && !needUploads;
    const needContent = !needSaved && !needUploads;

    const type_ = view === "Uploads" ? undefined : view;

    this.setState(s => ({
      personRes: needPerson ? LOADING_REQUEST : s.personRes,
      personContentRes: LOADING_REQUEST,
      personSavedRes: LOADING_REQUEST,
      uploadsRes: LOADING_REQUEST,
    }));

    await Promise.all([
      needPerson &&
        HttpService.client.getPersonDetails({
          username: props.match.params.username,
        }),
      needContent &&
        HttpService.client.listPersonContent({
          type_,
          username: props.match.params.username,
          page_cursor: page,
        }),
      needSaved &&
        HttpService.client.listPersonSaved({
          type_,
          page_cursor: page,
        }),
      needUploads &&
        HttpService.client.listMedia({
          page: parseInt(page ?? "1"),
          limit: fetchLimit,
        }),
    ]).then(args => {
      const [personRes, personContentRes, personSavedRes, uploadsRes] = args;
      if (token === this.fetchUserDataToken) {
        this.setState(s => ({
          personRes: personRes || s.personRes,
          personContentRes: personContentRes || EMPTY_REQUEST,
          personSavedRes: personSavedRes || EMPTY_REQUEST,
          uploadsRes: uploadsRes || EMPTY_REQUEST,
          personBlocked: isPersonBlocked(s.personRes, this.isoData.myUserInfo),
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

  static async fetchInitialData({
    headers,
    query: { view, page, saved },
    match: {
      params: { username },
    },
    myUserInfo,
  }: InitialFetchRequest<
    ProfilePathProps,
    ProfileProps
  >): Promise<ProfileData> {
    const client = wrapClient(
      new LemmyHttp(getHttpBaseInternal(), { headers }),
    );
    const isMe = usernameIsPerson(username, myUserInfo?.local_user_view.person);

    const needUploads = isMe && view === "Uploads";
    const needSaved = isMe && saved && !needUploads;
    const needContent = !needUploads && !needSaved;

    const type_ = view === "Uploads" ? undefined : view;

    return await Promise.all([
      client.getPersonDetails({ username }),
      needContent &&
        client.listPersonContent({ type_, username, page_cursor: page }),
      needSaved && client.listPersonSaved({ type_, page_cursor: page }),
      needUploads &&
        client.listMedia({ page: parseInt(page ?? "1"), limit: fetchLimit }),
    ]).then(args => {
      const [personRes, personContentRes, personSavedRes, uploadsRes] = args;
      return {
        personRes: personRes || EMPTY_REQUEST,
        personContentRes: personContentRes || EMPTY_REQUEST,
        personSavedRes: personSavedRes || EMPTY_REQUEST,
        uploadsRes: uploadsRes || EMPTY_REQUEST,
      };
    });
  }

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
            <MediaUploads uploads={uploadsRes} />
            <Paginator
              page={parseInt(this.props.page ?? "1")}
              onChange={this.handlePageNumberChange}
              nextDisabled={false}
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
        const { sort, view, saved } = this.props;

        const savedContent =
          (saved &&
            this.state.personSavedRes.state === "success" &&
            this.state.personSavedRes.data.saved) ||
          undefined;
        const content =
          (!saved &&
            this.state.personContentRes.state === "success" &&
            this.state.personContentRes.data.content) ||
          undefined;
        const resState = saved
          ? this.state.personSavedRes.state
          : this.state.personContentRes.state;

        const isUpload = view === "Uploads";

        return (
          <div className="row">
            <div className="col-12 col-md-8">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                canonicalPath={personRes.person_view.person.ap_id}
                description={personRes.person_view.person.bio}
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
                    content={savedContent ?? content ?? []}
                    nextPageCursor={this.nextPageCursor}
                    admins={siteRes.admins}
                    sort={sort}
                    limit={fetchLimit}
                    enableDownvotes={enableDownvotes(siteRes)}
                    enableNsfw={enableNsfw(siteRes)}
                    showAdultConsentModal={this.isoData.showAdultConsentModal}
                    view={view}
                    myUserInfo={this.isoData.myUserInfo}
                    onPageChange={this.handlePageChange}
                    allLanguages={siteRes.all_languages}
                    siteLanguages={siteRes.discussion_languages}
                    // TODO all the forms here
                    onSaveComment={this.handleSaveComment}
                    onBlockPerson={this.handleBlockPersonAlt}
                    onDeleteComment={this.handleDeleteComment}
                    onRemoveComment={this.handleRemoveComment}
                    onCommentVote={this.handleCommentVote}
                    onCommentReport={this.handleCommentReport}
                    onDistinguishComment={this.handleDistinguishComment}
                    onAddModToCommunity={this.handleAddModToCommunity}
                    onAddAdmin={this.handleAddAdmin}
                    onTransferCommunity={this.handleTransferCommunity}
                    onPurgeComment={this.handlePurgeComment}
                    onPurgePerson={this.handlePurgePerson}
                    onCommentReplyRead={this.handleCommentReplyRead}
                    onPersonMentionRead={this.handlePersonMentionRead}
                    onBanPersonFromCommunity={this.handleBanFromCommunity}
                    onBanPerson={this.handleBanPerson}
                    onCreateComment={this.handleCreateComment}
                    onEditComment={this.handleEditComment}
                    onPostEdit={this.handlePostEdit}
                    onPostVote={this.handlePostVote}
                    onPostReport={this.handlePostReport}
                    onLockPost={this.handleLockPost}
                    onDeletePost={this.handleDeletePost}
                    onRemovePost={this.handleRemovePost}
                    onSavePost={this.handleSavePost}
                    onPurgePost={this.handlePurgePost}
                    onFeaturePost={this.handleFeaturePost}
                    onMarkPostAsRead={this.handleMarkPostAsRead}
                  />
                ))}
            </div>

            <div className="col-12 col-md-4">
              <Moderates moderates={personRes.moderates} />
              {this.amCurrentUser && (
                <Follows myUserInfo={this.isoData.myUserInfo} />
              )}
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

  get nextPageCursor(): PaginationCursor | undefined {
    if (this.props.view === "Uploads") {
      return undefined;
    }
    const { personSavedRes: savedRes, personContentRes: contentRes } =
      this.state;
    if (this.props.saved) {
      return savedRes.state === "success" ? savedRes.data.next_page : undefined;
    } else {
      return contentRes.state === "success"
        ? contentRes.data.next_page
        : undefined;
    }
  }

  get viewRadios() {
    return (
      <div className="btn-group btn-group-toggle flex-wrap" role="group">
        {this.getRadio("All")}
        {this.getRadio("Comments")}
        {this.getRadio("Posts")}
        {this.amCurrentUser && this.getRadio("Uploads")}
        {this.amCurrentUser && this.getSavedToggle()}
      </div>
    );
  }

  getRadio(view: PersonDetailsView) {
    const { view: urlView, saved } = this.props;
    const active = view === urlView;
    const radioId = randomStr();

    return (
      <>
        <input
          id={radioId}
          type="radio"
          className="btn-check"
          value={view}
          checked={active}
          onChange={linkEvent(this, this.handleViewChange)}
          disabled={saved && view === "Uploads"}
        />
        <label
          htmlFor={radioId}
          className={classNames("btn btn-outline-secondary pointer", {
            active,
          })}
        >
          {I18NextService.i18n.t(view.toLowerCase() as NoOptionI18nKeys)}
        </label>
      </>
    );
  }

  getSavedToggle() {
    const checked = this.props.saved;

    // This renders a button inside a button. Using only the outer button, when
    // checked, it looks the same as the radio buttons (which do nothing when
    // clicked again). Using only the inner button, the button looks like it's
    // already checked when hovered or focused (except for the checkbox). The
    // inner button is hidden for keyboards an aria.
    return (
      <>
        <input
          id="saved-checkbox-outer"
          type="checkbox"
          class="btn-check"
          onClick={linkEvent(this, this.handleToggleSaved)}
          checked={checked}
          aria-label={I18NextService.i18n.t("saved")}
          disabled={this.props.view === "Uploads"}
        ></input>
        <label htmlFor="saved-checkbox-outer" class="btn btn-outline-secondary">
          <div class="form-check" aria-hidden="true">
            <input
              id="saved-checkbox-inner"
              type="checkbox"
              class="form-check-input pointer"
              checked={checked}
              onChange={linkEvent(this, this.handleToggleSaved)}
              autoComplete="off"
              tabIndex={-1}
            />
            <label
              htmlFor="saved-checkbox-inner"
              class="form-check-label pointer"
            >
              {I18NextService.i18n.t("saved")}
            </label>
          </div>
        </label>
      </>
    );
  }

  get selects() {
    const { sort, saved } = this.props;
    const { username } = this.props.match.params;

    const profileRss = `/feeds/u/${username}.xml${getQueryString({ sort })}`;

    return (
      <div className="row align-items-center mb-3 g-3">
        <div className="col-auto">{this.viewRadios}</div>
        <div className="col-auto">
          <PostSortSelect current={sort} onChange={this.handleSortChange} />
        </div>
        {/* Don't show the rss feed for the Saved view, as that's not implemented.*/}
        {!saved && (
          <div className="col-auto">
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

    return (
      pv && (
        <div>
          {!pv.person.banned && (
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
                        realLink
                        useApubName
                        muted
                        hideAvatar
                      />
                    </li>
                    <li className="list-inline-item">
                      <UserBadges
                        classNames="ms-1"
                        isBanned={pv.person.banned}
                        isDeleted={pv.person.deleted}
                        isAdmin={pv.is_admin}
                        isBot={pv.person.bot_account}
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
                          "d-flex align-self-start btn btn-secondary me-2"
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
                        className={`d-flex align-self-start btn btn-secondary me-2`}
                        rel={relTags}
                        href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                      >
                        {I18NextService.i18n.t("send_secure_message")}
                      </a>
                    )}
                    <Link
                      className={
                        "d-flex align-self-start btn btn-secondary me-2"
                      }
                      to={`/create_private_message/${pv.person.id}`}
                    >
                      {I18NextService.i18n.t("send_message")}
                    </Link>
                    {personBlocked ? (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary me-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleUnblockPerson,
                        )}
                      >
                        {I18NextService.i18n.t("unblock_user")}
                      </button>
                    ) : (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary me-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleBlockPerson,
                        )}
                      >
                        {I18NextService.i18n.t("block_user")}
                      </button>
                    )}
                  </>
                )}

                {canAdmin(pv.person.id, admins, this.isoData.myUserInfo) &&
                  !pv.is_admin &&
                  !showBanDialog &&
                  (!pv.person.banned ? (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary me-2"
                      }
                      onClick={linkEvent(this, this.handleModBanShow)}
                      aria-label={I18NextService.i18n.t("ban")}
                    >
                      {capitalizeFirstLetter(I18NextService.i18n.t("ban"))}
                    </button>
                  ) : (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary me-2"
                      }
                      onClick={linkEvent(this, this.handleModBanSubmit)}
                      aria-label={I18NextService.i18n.t("unban")}
                    >
                      {capitalizeFirstLetter(I18NextService.i18n.t("unban"))}
                    </button>
                  ))}
                {amAdmin(this.isoData.myUserInfo) && (
                  <>
                    <button
                      className={
                        "d-flex registration-self-start btn btn-secondary me-2"
                      }
                      aria-label={I18NextService.i18n.t("view_registration")}
                      onClick={this.handleRegistrationShow}
                    >
                      {I18NextService.i18n.t("view_registration")}
                    </button>
                    {showRegistrationDialog && (
                      <DisplayModal
                        onClose={this.handleRegistrationClose}
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
                  published={pv.person.published}
                  showAgo
                  ignoreUpdated
                />
              </div>
              <div className="d-flex align-items-center text-muted mb-2">
                <Icon icon="cake" />
                <span className="ms-2">
                  {I18NextService.i18n.t("cake_day_title")}{" "}
                  {format(cakeDate(pv.person.published), "PPP")}
                </span>
              </div>
              {!this.isoData.myUserInfo && (
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
        <form onSubmit={linkEvent(this, this.handleModBanSubmit)}>
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
              onInput={linkEvent(this, this.handleModBanReasonChange)}
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
              onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
            />
            <div className="input-group mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="mod-ban-remove-data"
                  type="checkbox"
                  checked={this.state.removeOrRestoreData}
                  onChange={linkEvent(this, this.handleModRemoveDataChange)}
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
          {/*   <input type="date" class="form-control me-2" placeholder={I18NextService.i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
          {/* </div> */}
          <div className="mb-3 row">
            <button
              type="reset"
              className="btn btn-secondary me-2"
              aria-label={I18NextService.i18n.t("cancel")}
              onClick={linkEvent(this, this.handleModBanSubmitCancel)}
            >
              {I18NextService.i18n.t("cancel")}
            </button>
          </div>
          <div className="mb-3 row">
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={I18NextService.i18n.t("ban")}
            >
              {I18NextService.i18n.t("ban")} {pv.person.name}
            </button>
          </div>
        </form>
      )
    );
  }

  async updateUrl(props: Partial<ProfileRouteProps>) {
    const {
      page,
      sort,
      view,
      saved,
      match: {
        params: { username },
      },
    } = { ...this.props, ...props };

    const queryParams: QueryParams<ProfileProps> = {
      page,
      sort,
      view: view !== getViewFromProps(undefined) ? view : undefined,
      saved: saved ? saved.toString() : undefined,
    };

    this.props.history.push(`/u/${username}${getQueryString(queryParams)}`);
  }

  handlePageChange(page: PaginationCursor) {
    this.updateUrl({ page });
  }

  handlePageNumberChange(page: number) {
    this.updateUrl({ page: page.toString() });
  }

  handleSortChange(sort: PostSortType) {
    this.updateUrl({ sort, page: undefined });
  }

  handleViewChange(i: Profile, event: any) {
    i.updateUrl({
      view: getViewFromProps(event.target.value),
      page: undefined,
    });
  }

  handleToggleSaved(i: Profile, event?: any) {
    event.preventDefault(); // prevent inner button also triggering outer button
    i.updateUrl({
      saved: !i.props.saved,
      page: undefined,
    });
  }

  handleModBanShow(i: Profile) {
    i.setState({ showBanDialog: true });
  }

  handleModBanReasonChange(i: Profile, event: any) {
    i.setState({ banReason: event.target.value });
  }

  handleModBanExpireDaysChange(i: Profile, event: any) {
    i.setState({ banExpireDays: event.target.value });
  }

  handleModRemoveDataChange(i: Profile, event: any) {
    i.setState({ removeOrRestoreData: event.target.checked });
  }

  handleModBanSubmitCancel(i: Profile) {
    i.setState({ showBanDialog: false });
  }

  handleRegistrationShow() {
    if (this.state.registrationRes.state !== "success") {
      this.setState({ registrationRes: LOADING_REQUEST });
    }

    this.setState({ showRegistrationDialog: true });

    if (this.state.personRes.state === "success") {
      HttpService.client
        .getRegistrationApplication({
          person_id: this.state.personRes.data.person_view.person.id,
        })
        .then(res => {
          this.setState({ registrationRes: res });

          if (res.state === "failed") {
            toast(I18NextService.i18n.t("fetch_registration_error"), "danger");
          }
        });
    }
  }

  handleRegistrationClose() {
    this.setState({ showRegistrationDialog: false });
  }

  async handleModBanSubmit(i: Profile, event: any) {
    event.preventDefault();
    const { banReason, banExpireDays } = i.state;

    const personRes = i.state.personRes;

    if (personRes.state === "success") {
      const person = personRes.data.person_view.person;
      const ban = !person.banned;

      // If its an unban, restore all their data
      if (!ban) {
        i.setState({ removeOrRestoreData: true });
      }

      const res = await HttpService.client.banPerson({
        person_id: person.id,
        ban,
        remove_or_restore_data: i.state.removeOrRestoreData,
        reason: banReason,
        expires: futureDaysToUnixTime(banExpireDays),
      });
      // TODO
      this.updateBan(res);
      i.setState({ showBanDialog: false });
    }
  }

  async toggleBlockPerson(recipientId: number, block: boolean) {
    const res = await HttpService.client.blockPerson({
      person_id: recipientId,
      block,
    });
    if (res.state === "success") {
      updatePersonBlock(res.data);
      this.setState({ personBlocked: res.data.blocked });
    }
  }

  handleUnblockPerson(personId: number) {
    this.toggleBlockPerson(personId, false);
  }

  handleBlockPerson(personId: number) {
    this.toggleBlockPerson(personId, true);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    // TODO not sure what to do here
    await HttpService.client.addModToCommunity(form);
  }

  async handlePurgePerson(form: PurgePerson) {
    const purgePersonRes = await HttpService.client.purgePerson(form);
    this.purgeItem(purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    const purgeCommentRes = await HttpService.client.purgeComment(form);
    this.purgeItem(purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    const purgeRes = await HttpService.client.purgePost(form);
    this.purgeItem(purgeRes);
  }

  async handleBlockPersonAlt(form: BlockPerson) {
    const blockPersonRes = await HttpService.client.blockPerson(form);
    if (blockPersonRes.state === "success") {
      updatePersonBlock(blockPersonRes.data);
      this.setState({ personBlocked: blockPersonRes.data.blocked });
    }
  }

  async handleCreateComment(form: CreateComment) {
    const createCommentRes = await HttpService.client.createComment(form);
    this.createAndUpdateComments(createCommentRes);

    return createCommentRes;
  }

  async handleEditComment(form: EditComment) {
    const editCommentRes = await HttpService.client.editComment(form);
    this.findAndUpdateComment(editCommentRes);

    return editCommentRes;
  }

  async handleDeleteComment(form: DeleteComment) {
    const deleteCommentRes = await HttpService.client.deleteComment(form);
    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    const deleteRes = await HttpService.client.deletePost(form);
    this.findAndUpdatePost(deleteRes);
  }

  async handleRemovePost(form: RemovePost) {
    const removeRes = await HttpService.client.removePost(form);
    this.findAndUpdatePost(removeRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    const removeCommentRes = await HttpService.client.removeComment(form);
    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    const saveCommentRes = await HttpService.client.saveComment(form);
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    const saveRes = await HttpService.client.savePost(form);
    this.findAndUpdatePost(saveRes);
  }

  async handleFeaturePost(form: FeaturePost) {
    const featureRes = await HttpService.client.featurePost(form);
    this.findAndUpdatePost(featureRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    const voteRes = await HttpService.client.likeComment(form);
    this.findAndUpdateComment(voteRes);
  }

  async handlePostVote(form: CreatePostLike) {
    const voteRes = await HttpService.client.likePost(form);
    this.findAndUpdatePost(voteRes);
    return voteRes;
  }

  async handlePostEdit(form: EditPost) {
    const res = await HttpService.client.editPost(form);
    this.findAndUpdatePost(res);
    return res;
  }

  async handleCommentReport(form: CreateCommentReport) {
    const reportRes = await HttpService.client.createCommentReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    const reportRes = await HttpService.client.createPostReport(form);
    if (reportRes.state === "success") {
      toast(I18NextService.i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    const lockRes = await HttpService.client.lockPost(form);
    this.findAndUpdatePost(lockRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    const distinguishRes = await HttpService.client.distinguishComment(form);
    this.findAndUpdateComment(distinguishRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    const addAdminRes = await HttpService.client.addAdmin(form);

    if (addAdminRes.state === "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    await HttpService.client.transferCommunity(form);
    toast(I18NextService.i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    // TODO: can't find a comment from reply_id, comments don't have reply read state
    await HttpService.client.markCommentReplyAsRead(form);
  }

  async handlePersonMentionRead(form: MarkPersonCommentMentionAsRead) {
    // TODO: can't find a comment from mention_id, comments don't have mention read state
    await HttpService.client.markCommentMentionAsRead(form);
  }

  async handleMarkPostAsRead(form: MarkPostAsRead) {
    const res = await HttpService.client.markPostAsRead(form);
    if (res.state === "success") {
      this.updateCurrentList(c => {
        if (
          c.type_ === "Post" &&
          c.post.id === form.post_id &&
          this.isoData.myUserInfo
        ) {
          if (!c.post_actions) {
            c.post_actions = {
              post_id: c.post.id,
              person_id: this.isoData.myUserInfo.local_user_view.person.id,
            };
          }
          c.post_actions.read = nowBoolean(form.read);
        }
        return c;
      });
    }
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    const banRes = await HttpService.client.banFromCommunity(form);
    this.updateBanFromCommunity(banRes, form.community_id);
  }

  async handleBanPerson(form: BanPerson) {
    const banRes = await HttpService.client.banPerson(form);
    this.updateBan(banRes);
  }

  updateCurrentList(
    mapFn: (c: PersonContentCombinedView) => PersonContentCombinedView,
  ) {
    if (this.props.saved) {
      this.setState(s => {
        if (s.personSavedRes.state === "success") {
          s.personSavedRes.data.saved = s.personSavedRes.data.saved.map(mapFn);
        }
        return { personSavedRes: s.personSavedRes };
      });
    } else {
      this.setState(s => {
        if (s.personContentRes.state === "success") {
          s.personContentRes.data.content =
            s.personContentRes.data.content.map(mapFn);
        }
        return { personContentRes: s.personContentRes };
      });
    }
  }

  editCombinedCurrent(data: PersonContentCombinedView) {
    if (this.props.saved) {
      this.setState(s => {
        if (s.personSavedRes.state === "success") {
          s.personSavedRes.data.saved = editCombined(
            data,
            s.personSavedRes.data.saved,
            getUncombinedPersonContent,
          );
        }
        return { personSavedRes: s.personSavedRes };
      });
    } else {
      this.setState(s => {
        if (s.personContentRes.state === "success") {
          s.personContentRes.data.content = editCombined(
            data,
            s.personContentRes.data.content,
            getUncombinedPersonContent,
          );
        }
        return { personContentRes: s.personContentRes };
      });
    }
  }

  updateBanFromCommunity(
    banRes: RequestState<BanFromCommunityResponse>,
    communityId: CommunityId,
  ) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.updateCurrentList(c =>
        c.creator.id === banRes.data.person_view.person.id &&
        c.community.id === communityId
          ? {
              ...c,
              creator_banned_from_community: banRes.data.banned,
            }
          : c,
      );
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state === "success") {
      this.updateCurrentList(c =>
        c.creator.id === banRes.data.person_view.person.id
          ? {
              ...c,
              creator: { ...c.creator, banned: banRes.data.banned },
            }
          : c,
      );
    }
  }

  purgeItem(purgeRes: RequestState<SuccessResponse>) {
    if (purgeRes.state === "success") {
      toast(I18NextService.i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    if (res.state === "success") {
      this.editCombinedCurrent({ type_: "Comment", ...res.data.comment_view });
    }
  }

  createAndUpdateComments(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.personContentRes.state === "success" && res.state === "success") {
        s.personContentRes.data.content.unshift({
          type_: "Comment",
          ...res.data.comment_view,
        });
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    if (res.state === "success") {
      this.editCombinedCurrent({ type_: "Post", ...res.data.post_view });
    }
  }
}
