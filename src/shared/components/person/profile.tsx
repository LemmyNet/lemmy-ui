import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdmin,
  AddAdminResponse,
  AddModToCommunity,
  AddModToCommunityResponse,
  BanFromCommunity,
  BanFromCommunityResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentReplyResponse,
  CommentReportResponse,
  CommentResponse,
  Community,
  CommunityModeratorView,
  CommunityResponse,
  CreateComment,
  CreateCommentLike,
  CreateCommentReport,
  CreatePostLike,
  CreatePostReport,
  DeleteComment,
  DeletePost,
  DistinguishComment,
  EditComment,
  FeaturePost,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  LockPost,
  MarkCommentReplyAsRead,
  MarkPersonMentionAsRead,
  PersonMentionResponse,
  PersonView,
  PostReportResponse,
  PostResponse,
  PurgeComment,
  PurgeItemResponse,
  PurgePerson,
  PurgePost,
  RemoveComment,
  RemovePost,
  SaveComment,
  SavePost,
  SortType,
  TransferCommunity,
} from "lemmy-js-client";
import moment from "moment";
import { i18n } from "../../i18next";
import { InitialFetchRequest, PersonDetailsView } from "../../interfaces";
import { UserService } from "../../services";
import {
  HttpService,
  RequestState,
  apiWrapper,
  apiWrapperIso,
} from "../../services/HttpService";
import {
  QueryParams,
  canMod,
  capitalizeFirstLetter,
  editCommentWithCommentReplies,
  editComments,
  editPosts,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  futureDaysToUnixTime,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isAdmin,
  isBanned,
  isInitialRoute,
  mdToHtml,
  myAuth,
  myAuthRequired,
  numToSI,
  relTags,
  restoreScrollPosition,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
} from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonDetails } from "./person-details";
import { PersonListing } from "./person-listing";

interface ProfileState {
  personRes: RequestState<GetPersonDetailsResponse>;
  personBlocked: boolean;
  banReason?: string;
  banExpireDays?: number;
  showBanDialog: boolean;
  removeData: boolean;
  siteRes: GetSiteResponse;

  addModRes: RequestState<AddModToCommunityResponse>;

  votePostRes: RequestState<PostResponse>;
  reportPostRes: RequestState<PostReportResponse>;
  lockPostRes: RequestState<PostResponse>;
  deletePostRes: RequestState<PostResponse>;
  removePostRes: RequestState<PostResponse>;
  savePostRes: RequestState<PostResponse>;
  featurePostCommunityRes: RequestState<PostResponse>;
  featurePostLocalRes: RequestState<PostResponse>;
  banPersonRes: RequestState<BanPersonResponse>;
  banFromCommunityRes: RequestState<BanPersonResponse>;
  addAdminRes: RequestState<AddAdminResponse>;
  transferCommunityRes: RequestState<CommunityResponse>;
  purgePostRes: RequestState<PurgeItemResponse>;
  purgePersonRes: RequestState<PurgeItemResponse>;

  createCommentRes: RequestState<CommentResponse>;
  editCommentRes: RequestState<CommentResponse>;
  voteCommentRes: RequestState<CommentResponse>;
  saveCommentRes: RequestState<CommentResponse>;
  readCommentReplyRes: RequestState<CommentReplyResponse>;
  readPersonMentionRes: RequestState<PersonMentionResponse>;
  blockPersonRes: RequestState<BlockPersonResponse>;
  deleteCommentRes: RequestState<CommentResponse>;
  removeCommentRes: RequestState<CommentResponse>;
  distinguishCommentRes: RequestState<CommentResponse>;
  reportCommentRes: RequestState<CommentReportResponse>;
  purgeCommentRes: RequestState<PurgeItemResponse>;
}

interface ProfileProps {
  view: PersonDetailsView;
  sort: SortType;
  page: number;
}

function getProfileQueryParams() {
  return getQueryParams<ProfileProps>({
    view: getViewFromProps,
    page: getPageFromString,
    sort: getSortTypeFromQuery,
  });
}

function getSortTypeFromQuery(sort?: string): SortType {
  return sort ? (sort as SortType) : "New";
}

function getViewFromProps(view?: string): PersonDetailsView {
  return view
    ? PersonDetailsView[view] ?? PersonDetailsView.Overview
    : PersonDetailsView.Overview;
}

const getCommunitiesListing = (
  translationKey: NoOptionI18nKeys,
  communityViews?: { community: Community }[]
) =>
  communityViews &&
  communityViews.length > 0 && (
    <div className="card border-secondary mb-3">
      <div className="card-body">
        <h5>{i18n.t(translationKey)}</h5>
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

const Follows = () =>
  getCommunitiesListing("subscribed", UserService.Instance.myUserInfo?.follows);

export class Profile extends Component<
  RouteComponentProps<{ username: string }>,
  ProfileState
> {
  private isoData = setIsoData(this.context);
  state: ProfileState = {
    personRes: { state: "empty" },
    personBlocked: false,
    siteRes: this.isoData.site_res,
    showBanDialog: false,
    removeData: false,
    addModRes: { state: "empty" },
    votePostRes: { state: "empty" },
    reportPostRes: { state: "empty" },
    lockPostRes: { state: "empty" },
    deletePostRes: { state: "empty" },
    removePostRes: { state: "empty" },
    savePostRes: { state: "empty" },
    featurePostCommunityRes: { state: "empty" },
    featurePostLocalRes: { state: "empty" },
    banPersonRes: { state: "empty" },
    banFromCommunityRes: { state: "empty" },
    addAdminRes: { state: "empty" },
    transferCommunityRes: { state: "empty" },
    purgePostRes: { state: "empty" },
    purgePersonRes: { state: "empty" },
    createCommentRes: { state: "empty" },
    editCommentRes: { state: "empty" },
    voteCommentRes: { state: "empty" },
    saveCommentRes: { state: "empty" },
    readCommentReplyRes: { state: "empty" },
    readPersonMentionRes: { state: "empty" },
    blockPersonRes: { state: "empty" },
    deleteCommentRes: { state: "empty" },
    removeCommentRes: { state: "empty" },
    distinguishCommentRes: { state: "empty" },
    reportCommentRes: { state: "empty" },
    purgeCommentRes: { state: "empty" },
  };

  constructor(props: RouteComponentProps<{ username: string }>, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

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
    this.handleBanFromCommunity = this.handleBanFromCommunity.bind(this);
    this.handleBanPerson = this.handleBanPerson.bind(this);
    this.handlePostVote = this.handlePostVote.bind(this);
    this.handlePostReport = this.handlePostReport.bind(this);
    this.handleLockPost = this.handleLockPost.bind(this);
    this.handleDeletePost = this.handleDeletePost.bind(this);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleSavePost = this.handleSavePost.bind(this);
    this.handlePurgePost = this.handlePurgePost.bind(this);
    this.handleFeaturePostLocal = this.handleFeaturePostLocal.bind(this);
    this.handleFeaturePostCommunity =
      this.handleFeaturePostCommunity.bind(this);

    // Only fetch the data if coming from another route
    if (isInitialRoute(this.isoData, this.context)) {
      this.state = {
        ...this.state,
        personRes: apiWrapperIso(
          this.isoData.routeData[0] as GetPersonDetailsResponse
        ),
      };
    }
  }

  async componentDidMount() {
    if (!isInitialRoute(this.isoData, this.context)) {
      await this.fetchUserData();
    }
    setupTippy();
  }

  componentWillUnmount() {
    saveScrollPosition(this.context);
  }

  async fetchUserData() {
    const { page, sort, view } = getProfileQueryParams();

    this.setState({ personRes: { state: "empty" } });
    this.setState({
      personRes: await apiWrapper(
        HttpService.client.getPersonDetails({
          username: this.props.match.params.username,
          sort,
          saved_only: view === PersonDetailsView.Saved,
          page,
          limit: fetchLimit,
          auth: myAuth(),
        })
      ),
    });
    restoreScrollPosition(this.context);
    this.setPersonBlock();
  }

  get amCurrentUser() {
    if (this.state.personRes.state == "success") {
      return (
        UserService.Instance.myUserInfo?.local_user_view.person.id ===
        this.state.personRes.data.person_view.person.id
      );
    } else {
      return false;
    }
  }

  setPersonBlock() {
    const mui = UserService.Instance.myUserInfo;
    const res = this.state.personRes;

    if (mui && res.state == "success") {
      this.setState({
        personBlocked: mui.person_blocks.some(
          ({ target: { id } }) => id === res.data.person_view.person.id
        ),
      });
    }
  }

  static fetchInitialData({
    client,
    path,
    query: { page, sort, view: urlView },
    auth,
  }: InitialFetchRequest<QueryParams<ProfileProps>>): Promise<any>[] {
    const pathSplit = path.split("/");

    const username = pathSplit[2];
    const view = getViewFromProps(urlView);

    const form: GetPersonDetails = {
      username: username,
      sort: getSortTypeFromQuery(sort),
      saved_only: view === PersonDetailsView.Saved,
      page: getPageFromString(page),
      limit: fetchLimit,
      auth,
    };

    return [client.getPersonDetails(form)];
  }

  get documentTitle(): string {
    const siteName = this.state.siteRes.site_view.site.name;
    const res = this.state.personRes;
    return res.state == "success"
      ? `@${res.data.person_view.person.name} - ${siteName}`
      : siteName;
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
        const { page, sort, view } = getProfileQueryParams();

        return (
          <div className="row">
            <div className="col-12 col-md-8">
              <HtmlTags
                title={this.documentTitle}
                path={this.context.router.route.match.url}
                description={personRes.person_view.person.bio}
                image={personRes.person_view.person.avatar}
              />

              {this.userInfo(personRes.person_view)}

              <hr />

              {this.selects}

              <PersonDetails
                personRes={personRes}
                admins={siteRes.admins}
                sort={sort}
                page={page}
                limit={fetchLimit}
                enableDownvotes={enableDownvotes(siteRes)}
                enableNsfw={enableNsfw(siteRes)}
                view={view}
                onPageChange={this.handlePageChange}
                allLanguages={siteRes.all_languages}
                siteLanguages={siteRes.discussion_languages}
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
                onPostVote={this.handlePostVote}
                onPostReport={this.handlePostReport}
                onLockPost={this.handleLockPost}
                onDeletePost={this.handleDeletePost}
                onRemovePost={this.handleRemovePost}
                onSavePost={this.handleSavePost}
                onPurgePost={this.handlePurgePost}
                onFeaturePostLocal={this.handleFeaturePostLocal}
                onFeaturePostCommunity={this.handleFeaturePostCommunity}
                upvotePostLoading={this.state.votePostRes.state == "loading"}
                downvotePostLoading={this.state.votePostRes.state == "loading"}
                reportPostLoading={this.state.reportPostRes.state == "loading"}
                blockPersonLoading={
                  this.state.blockPersonRes.state == "loading"
                }
                lockPostLoading={this.state.lockPostRes.state == "loading"}
                deletePostLoading={this.state.deletePostRes.state == "loading"}
                removePostLoading={this.state.removePostRes.state == "loading"}
                savePostLoading={this.state.savePostRes.state == "loading"}
                featureCommunityLoading={
                  this.state.featurePostCommunityRes.state == "loading"
                }
                featureLocalLoading={
                  this.state.featurePostLocalRes.state == "loading"
                }
                banLoading={this.state.banPersonRes.state == "loading"}
                addModLoading={this.state.addModRes.state == "loading"}
                addAdminLoading={this.state.addAdminRes.state == "loading"}
                transferCommunityLoading={
                  this.state.transferCommunityRes.state == "loading"
                }
                purgeCommentLoading={
                  this.state.purgeCommentRes.state == "loading"
                }
                purgePostLoading={this.state.purgePersonRes.state == "loading"}
                createOrEditCommentLoading={
                  this.state.createCommentRes.state == "loading" ||
                  this.state.editCommentRes.state == "loading"
                }
                upvoteCommentLoading={
                  this.state.voteCommentRes.state == "loading"
                }
                downvoteCommentLoading={
                  this.state.voteCommentRes.state == "loading"
                }
                saveCommentLoading={
                  this.state.saveCommentRes.state == "loading"
                }
                readCommentLoading={
                  this.state.readCommentReplyRes.state == "loading" ||
                  this.state.readPersonMentionRes.state == "loading"
                }
                deleteCommentLoading={
                  this.state.deleteCommentRes.state == "loading"
                }
                removeCommentLoading={
                  this.state.removeCommentRes.state == "loading"
                }
                distinguishCommentLoading={
                  this.state.distinguishCommentRes.state == "loading"
                }
                reportCommentLoading={
                  this.state.reportCommentRes.state == "loading"
                }
              />
            </div>

            <div className="col-12 col-md-4">
              <Moderates moderates={personRes.moderates} />
              {this.amCurrentUser && <Follows />}
            </div>
          </div>
        );
      }
    }
  }

  render() {
    return <div className="container-lg">{this.renderPersonRes()}</div>;
  }

  get viewRadios() {
    return (
      <div className="btn-group btn-group-toggle flex-wrap mb-2">
        {this.getRadio(PersonDetailsView.Overview)}
        {this.getRadio(PersonDetailsView.Comments)}
        {this.getRadio(PersonDetailsView.Posts)}
        {this.getRadio(PersonDetailsView.Saved)}
      </div>
    );
  }

  getRadio(view: PersonDetailsView) {
    const { view: urlView } = getProfileQueryParams();
    const active = view === urlView;

    return (
      <label
        className={classNames("btn btn-outline-secondary pointer", {
          active,
        })}
      >
        <input
          type="radio"
          value={view}
          checked={active}
          onChange={linkEvent(this, this.handleViewChange)}
        />
        {i18n.t(view.toLowerCase() as NoOptionI18nKeys)}
      </label>
    );
  }

  get selects() {
    const { sort } = getProfileQueryParams();
    const { username } = this.props.match.params;

    const profileRss = `/feeds/u/${username}.xml?sort=${sort}`;

    return (
      <div className="mb-2">
        <span className="mr-3">{this.viewRadios}</span>
        <SortSelect
          sort={sort}
          onChange={this.handleSortChange}
          hideHot
          hideMostComments
        />
        <a href={profileRss} rel={relTags} title="RSS">
          <Icon icon="rss" classes="text-muted small mx-2" />
        </a>
        <link rel="alternate" type="application/atom+xml" href={profileRss} />
      </div>
    );
  }

  userInfo(pv: PersonView) {
    const {
      personBlocked,
      siteRes: { admins },
      showBanDialog,
    } = this.state;

    return (
      pv && (
        <div>
          {!isBanned(pv.person) && (
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
                    <h5 className="mb-0">{pv.person.display_name}</h5>
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
                    {isBanned(pv.person) && (
                      <li className="list-inline-item badge badge-danger">
                        {i18n.t("banned")}
                      </li>
                    )}
                    {pv.person.deleted && (
                      <li className="list-inline-item badge badge-danger">
                        {i18n.t("deleted")}
                      </li>
                    )}
                    {pv.person.admin && (
                      <li className="list-inline-item badge badge-light">
                        {i18n.t("admin")}
                      </li>
                    )}
                    {pv.person.bot_account && (
                      <li className="list-inline-item badge badge-light">
                        {i18n.t("bot_account").toLowerCase()}
                      </li>
                    )}
                  </ul>
                </div>
                {this.banDialog(pv)}
                <div className="flex-grow-1 unselectable pointer mx-2"></div>
                {!this.amCurrentUser && UserService.Instance.myUserInfo && (
                  <>
                    <a
                      className={`d-flex align-self-start btn btn-secondary mr-2 ${
                        !pv.person.matrix_user_id && "invisible"
                      }`}
                      rel={relTags}
                      href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                    >
                      {i18n.t("send_secure_message")}
                    </a>
                    <Link
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      to={`/create_private_message/${pv.person.id}`}
                    >
                      {i18n.t("send_message")}
                    </Link>
                    {personBlocked ? (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary mr-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleUnblockPerson
                        )}
                      >
                        {i18n.t("unblock_user")}
                      </button>
                    ) : (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary mr-2"
                        }
                        onClick={linkEvent(
                          pv.person.id,
                          this.handleBlockPerson
                        )}
                      >
                        {i18n.t("block_user")}
                      </button>
                    )}
                  </>
                )}

                {canMod(pv.person.id, undefined, admins) &&
                  !isAdmin(pv.person.id, admins) &&
                  !showBanDialog &&
                  (!isBanned(pv.person) ? (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      onClick={linkEvent(this, this.handleModBanShow)}
                      aria-label={i18n.t("ban")}
                    >
                      {capitalizeFirstLetter(i18n.t("ban"))}
                    </button>
                  ) : (
                    <button
                      className={
                        "d-flex align-self-start btn btn-secondary mr-2"
                      }
                      onClick={linkEvent(this, this.handleModBanSubmit)}
                      aria-label={i18n.t("unban")}
                    >
                      {capitalizeFirstLetter(i18n.t("unban"))}
                    </button>
                  ))}
              </div>
              {pv.person.bio && (
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="md-div"
                    dangerouslySetInnerHTML={mdToHtml(pv.person.bio)}
                  />
                </div>
              )}
              <div>
                <ul className="list-inline mb-2">
                  <li className="list-inline-item badge badge-light">
                    {i18n.t("number_of_posts", {
                      count: Number(pv.counts.post_count),
                      formattedCount: numToSI(pv.counts.post_count),
                    })}
                  </li>
                  <li className="list-inline-item badge badge-light">
                    {i18n.t("number_of_comments", {
                      count: Number(pv.counts.comment_count),
                      formattedCount: numToSI(pv.counts.comment_count),
                    })}
                  </li>
                </ul>
              </div>
              <div className="text-muted">
                {i18n.t("joined")}{" "}
                <MomentTime
                  published={pv.person.published}
                  showAgo
                  ignoreUpdated
                />
              </div>
              <div className="d-flex align-items-center text-muted mb-2">
                <Icon icon="cake" />
                <span className="ml-2">
                  {i18n.t("cake_day_title")}{" "}
                  {moment
                    .utc(pv.person.published)
                    .local()
                    .format("MMM DD, YYYY")}
                </span>
              </div>
              {!UserService.Instance.myUserInfo && (
                <div className="alert alert-info" role="alert">
                  {i18n.t("profile_not_logged_in_alert")}
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
          <div className="form-group row col-12">
            <label className="col-form-label" htmlFor="profile-ban-reason">
              {i18n.t("reason")}
            </label>
            <input
              type="text"
              id="profile-ban-reason"
              className="form-control mr-2"
              placeholder={i18n.t("reason")}
              value={this.state.banReason}
              onInput={linkEvent(this, this.handleModBanReasonChange)}
            />
            <label className="col-form-label" htmlFor={`mod-ban-expires`}>
              {i18n.t("expires")}
            </label>
            <input
              type="number"
              id={`mod-ban-expires`}
              className="form-control mr-2"
              placeholder={i18n.t("number_of_days")}
              value={this.state.banExpireDays}
              onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
            />
            <div className="form-group">
              <div className="form-check">
                <input
                  className="form-check-input"
                  id="mod-ban-remove-data"
                  type="checkbox"
                  checked={this.state.removeData}
                  onChange={linkEvent(this, this.handleModRemoveDataChange)}
                />
                <label
                  className="form-check-label"
                  htmlFor="mod-ban-remove-data"
                  title={i18n.t("remove_content_more")}
                >
                  {i18n.t("remove_content")}
                </label>
              </div>
            </div>
          </div>
          {/* TODO hold off on expires until later */}
          {/* <div class="form-group row"> */}
          {/*   <label class="col-form-label">Expires</label> */}
          {/*   <input type="date" class="form-control mr-2" placeholder={i18n.t('expires')} value={this.state.banExpires} onInput={linkEvent(this, this.handleModBanExpiresChange)} /> */}
          {/* </div> */}
          <div className="form-group row">
            <button
              type="reset"
              className="btn btn-secondary mr-2"
              aria-label={i18n.t("cancel")}
              onClick={linkEvent(this, this.handleModBanSubmitCancel)}
            >
              {i18n.t("cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-secondary"
              aria-label={i18n.t("ban")}
            >
              {i18n.t("ban")} {pv.person.name}
            </button>
          </div>
        </form>
      )
    );
  }

  async updateUrl({ page, sort, view }: Partial<ProfileProps>) {
    const {
      page: urlPage,
      sort: urlSort,
      view: urlView,
    } = getProfileQueryParams();

    const queryParams: QueryParams<ProfileProps> = {
      page: (page ?? urlPage).toString(),
      sort: sort ?? urlSort,
      view: view ?? urlView,
    };

    const { username } = this.props.match.params;

    this.props.history.push(`/u/${username}${getQueryString(queryParams)}`);
    await this.fetchUserData();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page });
  }

  handleSortChange(sort: SortType) {
    this.updateUrl({ sort, page: 1 });
  }

  handleViewChange(i: Profile, event: any) {
    i.updateUrl({
      view: PersonDetailsView[event.target.value],
      page: 1,
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
    i.setState({ removeData: event.target.checked });
  }

  handleModBanSubmitCancel(i: Profile) {
    i.setState({ showBanDialog: false });
  }

  async handleModBanSubmit(i: Profile) {
    const { removeData, banReason, banExpireDays } = i.state;

    const personRes = i.state.personRes;

    if (personRes.state == "success") {
      const person = personRes.data.person_view.person;
      const ban = !person.banned;

      // If its an unban, restore all their data
      if (!ban) {
        i.setState({ removeData: false });
      }

      i.setState({ banPersonRes: { state: "loading" } });

      const banPersonRes = await apiWrapper(
        HttpService.client.banPerson({
          person_id: person.id,
          ban,
          remove_data: removeData,
          reason: banReason,
          expires: futureDaysToUnixTime(banExpireDays),
          auth: myAuthRequired(),
        })
      );
      i.setState({ banPersonRes });

      i.updateBan(banPersonRes);
      i.setState({ showBanDialog: false });
    }
  }

  async toggleBlockPerson(recipientId: number, block: boolean) {
    this.setState({ blockPersonRes: { state: "loading" } });
    const blockPersonRes = await apiWrapper(
      HttpService.client.blockPerson({
        person_id: recipientId,
        block,
        auth: myAuthRequired(),
      })
    );

    this.setState({ blockPersonRes });
    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  handleUnblockPerson(personId: number) {
    this.toggleBlockPerson(personId, false);
  }

  handleBlockPerson(personId: number) {
    this.toggleBlockPerson(personId, true);
  }

  async handleAddModToCommunity(form: AddModToCommunity) {
    this.setState({ addModRes: { state: "loading" } });
    this.setState({
      addModRes: await apiWrapper(HttpService.client.addModToCommunity(form)),
    });
  }

  async handlePurgePerson(form: PurgePerson) {
    this.setState({ purgePersonRes: { state: "loading" } });
    this.setState({
      purgePersonRes: await apiWrapper(HttpService.client.purgePerson(form)),
    });
    this.purgeItem(this.state.purgePersonRes);
  }

  async handlePurgeComment(form: PurgeComment) {
    this.setState({ purgeCommentRes: { state: "loading" } });
    this.setState({
      purgeCommentRes: await apiWrapper(HttpService.client.purgeComment(form)),
    });
    this.purgeItem(this.state.purgeCommentRes);
  }

  async handlePurgePost(form: PurgePost) {
    this.setState({ purgePostRes: { state: "loading" } });
    this.setState({
      purgePostRes: await apiWrapper(HttpService.client.purgePost(form)),
    });
    this.purgeItem(this.state.purgePostRes);
  }

  async handleBlockPersonAlt(form: BlockPerson) {
    this.setState({ blockPersonRes: { state: "loading" } });
    const blockPersonRes = await apiWrapper(
      HttpService.client.blockPerson(form)
    );
    this.setState({ blockPersonRes });

    if (blockPersonRes.state == "success") {
      updatePersonBlock(blockPersonRes.data);
    }
  }

  async handleCreateComment(form: CreateComment) {
    this.setState({ createCommentRes: { state: "loading" } });

    const createCommentRes = await apiWrapper(
      HttpService.client.createComment(form)
    );
    this.setState({ createCommentRes });

    this.setState(s => {
      if (
        s.personRes.state == "success" &&
        createCommentRes.state == "success"
      ) {
        s.personRes.data.comments.unshift(createCommentRes.data.comment_view);
      }
      return s;
    });
  }

  async handleEditComment(form: EditComment) {
    this.setState({ editCommentRes: { state: "loading" } });
    const editCommentRes = await apiWrapper(
      HttpService.client.editComment(form)
    );
    this.setState({ editCommentRes });

    this.findAndUpdateComment(editCommentRes);
  }

  async handleDeleteComment(form: DeleteComment) {
    this.setState({ deleteCommentRes: { state: "loading" } });
    const deleteCommentRes = await apiWrapper(
      HttpService.client.deleteComment(form)
    );
    this.setState({ deleteCommentRes });

    this.findAndUpdateComment(deleteCommentRes);
  }

  async handleDeletePost(form: DeletePost) {
    this.setState({ deletePostRes: { state: "loading" } });
    const deletePostRes = await apiWrapper(HttpService.client.deletePost(form));
    this.setState({ deletePostRes });
    this.findAndUpdatePost(deletePostRes);
  }

  async handleRemovePost(form: RemovePost) {
    this.setState({ removePostRes: { state: "loading" } });
    const removePostRes = await apiWrapper(HttpService.client.removePost(form));
    this.setState({ removePostRes });
    this.findAndUpdatePost(removePostRes);
  }

  async handleRemoveComment(form: RemoveComment) {
    this.setState({ removeCommentRes: { state: "loading" } });
    const removeCommentRes = await apiWrapper(
      HttpService.client.removeComment(form)
    );
    this.setState({ removeCommentRes });

    this.findAndUpdateComment(removeCommentRes);
  }

  async handleSaveComment(form: SaveComment) {
    this.setState({ saveCommentRes: { state: "loading" } });
    const saveCommentRes = await apiWrapper(
      HttpService.client.saveComment(form)
    );
    this.setState({ saveCommentRes });
    this.findAndUpdateComment(saveCommentRes);
  }

  async handleSavePost(form: SavePost) {
    this.setState({ savePostRes: { state: "loading" } });
    const savePostRes = await apiWrapper(HttpService.client.savePost(form));
    this.setState({ savePostRes });
    this.findAndUpdatePost(savePostRes);
  }

  async handleFeaturePostLocal(form: FeaturePost) {
    this.setState({ featurePostLocalRes: { state: "loading" } });
    const featurePostLocalRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostLocalRes });
    this.findAndUpdatePost(featurePostLocalRes);
  }

  async handleFeaturePostCommunity(form: FeaturePost) {
    this.setState({ featurePostCommunityRes: { state: "loading" } });
    const featurePostCommunityRes = await apiWrapper(
      HttpService.client.featurePost(form)
    );
    this.setState({ featurePostCommunityRes });
    this.findAndUpdatePost(featurePostCommunityRes);
  }

  async handleCommentVote(form: CreateCommentLike) {
    this.setState({ voteCommentRes: { state: "loading" } });
    const voteCommentRes = await apiWrapper(
      HttpService.client.likeComment(form)
    );
    this.setState({ voteCommentRes });
    this.findAndUpdateComment(voteCommentRes);
  }

  async handlePostVote(form: CreatePostLike) {
    this.setState({ votePostRes: { state: "loading" } });
    const votePostRes = await apiWrapper(HttpService.client.likePost(form));
    this.setState({ votePostRes });
    this.findAndUpdatePost(votePostRes);
  }

  async handleCommentReport(form: CreateCommentReport) {
    this.setState({ reportCommentRes: { state: "loading" } });
    const reportCommentRes = await apiWrapper(
      HttpService.client.createCommentReport(form)
    );
    this.setState({ reportCommentRes });
    if (reportCommentRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handlePostReport(form: CreatePostReport) {
    this.setState({ reportPostRes: { state: "loading" } });
    const reportPostRes = await apiWrapper(
      HttpService.client.createPostReport(form)
    );
    this.setState({ reportPostRes });
    if (reportPostRes.state == "success") {
      toast(i18n.t("report_created"));
    }
  }

  async handleLockPost(form: LockPost) {
    this.setState({ lockPostRes: { state: "loading" } });
    const lockPostRes = await apiWrapper(HttpService.client.lockPost(form));
    this.setState({ lockPostRes });

    this.findAndUpdatePost(lockPostRes);
  }

  async handleDistinguishComment(form: DistinguishComment) {
    this.setState({ distinguishCommentRes: { state: "loading" } });
    const distinguishCommentRes = await apiWrapper(
      HttpService.client.distinguishComment(form)
    );
    this.setState({ distinguishCommentRes });
    this.findAndUpdateComment(distinguishCommentRes);
  }

  async handleAddAdmin(form: AddAdmin) {
    this.setState({ addAdminRes: { state: "loading" } });
    const addAdminRes = await apiWrapper(HttpService.client.addAdmin(form));
    this.setState({ addAdminRes });

    if (addAdminRes.state == "success") {
      this.setState(s => ((s.siteRes.admins = addAdminRes.data.admins), s));
    }
  }

  async handleTransferCommunity(form: TransferCommunity) {
    this.setState({ transferCommunityRes: { state: "loading" } });
    const transferCommunityRes = await apiWrapper(
      HttpService.client.transferCommunity(form)
    );
    this.setState({ transferCommunityRes });
    toast(i18n.t("transfer_community"));
  }

  async handleCommentReplyRead(form: MarkCommentReplyAsRead) {
    this.setState({ readCommentReplyRes: { state: "loading" } });
    const readCommentReplyRes = await apiWrapper(
      HttpService.client.markCommentReplyAsRead(form)
    );
    this.setState({ readCommentReplyRes });
    this.findAndUpdateCommentReply(readCommentReplyRes);
  }

  async handlePersonMentionRead(form: MarkPersonMentionAsRead) {
    this.setState({ readPersonMentionRes: { state: "loading" } });
    // TODO not sure what to do here. Maybe it is actually optional, because post doesn't need it.
    const readPersonMentionRes = await apiWrapper(
      HttpService.client.markPersonMentionAsRead(form)
    );
    this.setState({ readPersonMentionRes });
  }

  async handleBanFromCommunity(form: BanFromCommunity) {
    this.setState({ banFromCommunityRes: { state: "loading" } });
    const banFromCommunityRes = await apiWrapper(
      HttpService.client.banFromCommunity(form)
    );
    this.setState({ banFromCommunityRes });
    this.updateBanFromCommunity(banFromCommunityRes);
  }

  async handleBanPerson(form: BanPerson) {
    this.setState({ banPersonRes: { state: "loading" } });
    const banPersonRes = await apiWrapper(HttpService.client.banPerson(form));
    this.setState({ banPersonRes });
    this.updateBan(banPersonRes);
  }

  updateBanFromCommunity(banRes: RequestState<BanFromCommunityResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.personRes.state == "success") {
          s.personRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );

          s.personRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(
              c => (c.creator_banned_from_community = banRes.data.banned)
            );
        }
        return s;
      });
    }
  }

  updateBan(banRes: RequestState<BanPersonResponse>) {
    // Maybe not necessary
    if (banRes.state == "success") {
      this.setState(s => {
        if (s.personRes.state == "success") {
          s.personRes.data.posts
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
          s.personRes.data.comments
            .filter(c => c.creator.id == banRes.data.person_view.person.id)
            .forEach(c => (c.creator.banned = banRes.data.banned));
        }
        return s;
      });
    }
  }

  purgeItem(purgeRes: RequestState<PurgeItemResponse>) {
    if (purgeRes.state == "success") {
      toast(i18n.t("purge_success"));
      this.context.router.history.push(`/`);
    }
  }

  findAndUpdateComment(res: RequestState<CommentResponse>) {
    this.setState(s => {
      if (s.personRes.state == "success" && res.state == "success") {
        s.personRes.data.comments = editComments(
          res.data.comment_view,
          s.personRes.data.comments
        );
      }
      return s;
    });
  }

  findAndUpdateCommentReply(res: RequestState<CommentReplyResponse>) {
    this.setState(s => {
      if (s.personRes.state == "success" && res.state == "success") {
        s.personRes.data.comments = editCommentWithCommentReplies(
          res.data.comment_reply_view,
          s.personRes.data.comments
        );
      }
      return s;
    });
  }

  findAndUpdatePost(res: RequestState<PostResponse>) {
    this.setState(s => {
      if (s.personRes.state == "success" && res.state == "success") {
        s.personRes.data.posts = editPosts(
          res.data.post_view,
          s.personRes.data.posts
        );
      }
      return s;
    });
  }
}
