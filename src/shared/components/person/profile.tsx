import classNames from "classnames";
import { NoOptionI18nKeys } from "i18next";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import { RouteComponentProps } from "inferno-router/dist/Route";
import {
  AddAdminResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentResponse,
  Community,
  CommunityModeratorView,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  PostResponse,
  PurgeItemResponse,
  SortType,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import moment from "moment";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest, PersonDetailsView } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  QueryParams,
  WithPromiseKeys,
  canMod,
  capitalizeFirstLetter,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  enableDownvotes,
  enableNsfw,
  fetchLimit,
  futureDaysToUnixTime,
  getPageFromString,
  getQueryParams,
  getQueryString,
  isAdmin,
  isBanned,
  mdToHtml,
  myAuth,
  numToSI,
  relTags,
  restoreScrollPosition,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setupTippy,
  toast,
  updatePersonBlock,
  wsClient,
  wsSubscribe,
} from "../../utils";
import { BannerIconHeader } from "../common/banner-icon-header";
import { HtmlTags } from "../common/html-tags";
import { Icon, Spinner } from "../common/icon";
import { MomentTime } from "../common/moment-time";
import { SortSelect } from "../common/sort-select";
import { CommunityLink } from "../community/community-link";
import { PersonDetails } from "./person-details";
import { PersonListing } from "./person-listing";

interface ProfileData {
  personResponse: GetPersonDetailsResponse;
}

interface ProfileState {
  personRes?: GetPersonDetailsResponse;
  loading: boolean;
  personBlocked: boolean;
  banReason?: string;
  banExpireDays?: number;
  showBanDialog: boolean;
  removeData: boolean;
  siteRes: GetSiteResponse;
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

function toggleBlockPerson(recipientId: number, block: boolean) {
  const auth = myAuth();

  if (auth) {
    const blockUserForm: BlockPerson = {
      person_id: recipientId,
      block,
      auth,
    };

    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }
}

const handleUnblockPerson = (personId: number) =>
  toggleBlockPerson(personId, false);

const handleBlockPerson = (personId: number) =>
  toggleBlockPerson(personId, true);

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
  private isoData = setIsoData<ProfileData>(this.context);
  private subscription?: Subscription;
  state: ProfileState = {
    loading: true,
    personBlocked: false,
    siteRes: this.isoData.site_res,
    showBanDialog: false,
    removeData: false,
  };

  constructor(props: RouteComponentProps<{ username: string }>, context: any) {
    super(props, context);

    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path === this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        personRes: this.isoData.routeData.personResponse,
        loading: false,
      };
    } else {
      this.fetchUserData();
    }
  }

  fetchUserData() {
    const { page, sort, view } = getProfileQueryParams();

    const form: GetPersonDetails = {
      username: this.props.match.params.username,
      sort,
      saved_only: view === PersonDetailsView.Saved,
      page,
      limit: fetchLimit,
      auth: myAuth(false),
    };

    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  get amCurrentUser() {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ===
      this.state.personRes?.person_view.person.id
    );
  }

  setPersonBlock() {
    const mui = UserService.Instance.myUserInfo;
    const res = this.state.personRes;

    if (mui && res) {
      this.setState({
        personBlocked: mui.person_blocks.some(
          ({ target: { id } }) => id === res.person_view.person.id
        ),
      });
    }
  }

  static fetchInitialData({
    client,
    path,
    query: { page, sort, view: urlView },
    auth,
  }: InitialFetchRequest<
    QueryParams<ProfileProps>
  >): WithPromiseKeys<ProfileData> {
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

    return {
      personResponse: client.getPersonDetails(form),
    };
  }

  componentDidMount() {
    this.setPersonBlock();
    setupTippy();
  }

  componentWillUnmount() {
    this.subscription?.unsubscribe();
    saveScrollPosition(this.context);
  }

  get documentTitle(): string {
    const res = this.state.personRes;
    return res
      ? `@${res.person_view.person.name} - ${this.state.siteRes.site_view.site.name}`
      : "";
  }

  render() {
    const { personRes, loading, siteRes } = this.state;
    const { page, sort, view } = getProfileQueryParams();

    return (
      <div className="container-lg">
        {loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          personRes && (
            <div className="row">
              <div className="col-12 col-md-8">
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  description={personRes.person_view.person.bio}
                  image={personRes.person_view.person.avatar}
                />

                {this.userInfo}

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
                />
              </div>

              <div className="col-12 col-md-4">
                <Moderates moderates={personRes.moderates} />
                {this.amCurrentUser && <Follows />}
              </div>
            </div>
          )
        )}
      </div>
    );
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

  get userInfo() {
    const pv = this.state.personRes?.person_view;
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
                {this.banDialog}
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
                        onClick={linkEvent(pv.person.id, handleUnblockPerson)}
                      >
                        {i18n.t("unblock_user")}
                      </button>
                    ) : (
                      <button
                        className={
                          "d-flex align-self-start btn btn-secondary mr-2"
                        }
                        onClick={linkEvent(pv.person.id, handleBlockPerson)}
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

  get banDialog() {
    const pv = this.state.personRes?.person_view;
    const { showBanDialog } = this.state;

    return (
      pv && (
        <>
          {showBanDialog && (
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
          )}
        </>
      )
    );
  }

  updateUrl({ page, sort, view }: Partial<ProfileProps>) {
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

    this.setState({ loading: true });
    this.fetchUserData();
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

  handleModBanSubmitCancel(i: Profile, event?: any) {
    event.preventDefault();
    i.setState({ showBanDialog: false });
  }

  handleModBanSubmit(i: Profile, event?: any) {
    if (event) event.preventDefault();
    const { personRes, removeData, banReason, banExpireDays } = i.state;

    const person = personRes?.person_view.person;
    const auth = myAuth();

    if (person && auth) {
      const ban = !person.banned;

      // If its an unban, restore all their data
      if (!ban) {
        i.setState({ removeData: false });
      }

      const form: BanPerson = {
        person_id: person.id,
        ban,
        remove_data: removeData,
        reason: banReason,
        expires: futureDaysToUnixTime(banExpireDays),
        auth,
      };
      WebSocketService.Instance.send(wsClient.banPerson(form));

      i.setState({ showBanDialog: false });
    }
  }

  parseMessage(msg: any) {
    const op = wsUserOp(msg);
    console.log(msg);

    if (msg.error) {
      toast(i18n.t(msg.error), "danger");

      if (msg.error === "couldnt_find_that_username_or_email") {
        this.context.router.history.push("/");
      }
    } else if (msg.reconnect) {
      this.fetchUserData();
    } else {
      switch (op) {
        case UserOperation.GetPersonDetails: {
          // Since the PersonDetails contains posts/comments as well as some general user info we listen here as well
          // and set the parent state if it is not set or differs
          // TODO this might need to get abstracted
          const data = wsJsonToRes<GetPersonDetailsResponse>(msg);
          this.setState({ personRes: data, loading: false });
          this.setPersonBlock();
          restoreScrollPosition(this.context);

          break;
        }

        case UserOperation.AddAdmin: {
          const { admins } = wsJsonToRes<AddAdminResponse>(msg);
          this.setState(s => ((s.siteRes.admins = admins), s));

          break;
        }

        case UserOperation.CreateCommentLike: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          createCommentLikeRes(comment_view, this.state.personRes?.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.EditComment:
        case UserOperation.DeleteComment:
        case UserOperation.RemoveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          editCommentRes(comment_view, this.state.personRes?.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreateComment: {
          const {
            comment_view: {
              creator: { id },
            },
          } = wsJsonToRes<CommentResponse>(msg);
          const mui = UserService.Instance.myUserInfo;

          if (id === mui?.local_user_view.person.id) {
            toast(i18n.t("reply_sent"));
          }

          break;
        }

        case UserOperation.SaveComment: {
          const { comment_view } = wsJsonToRes<CommentResponse>(msg);
          saveCommentRes(comment_view, this.state.personRes?.comments);
          this.setState(this.state);

          break;
        }

        case UserOperation.EditPost:
        case UserOperation.DeletePost:
        case UserOperation.RemovePost:
        case UserOperation.LockPost:
        case UserOperation.FeaturePost:
        case UserOperation.SavePost: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);
          editPostFindRes(post_view, this.state.personRes?.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.CreatePostLike: {
          const { post_view } = wsJsonToRes<PostResponse>(msg);
          createPostLikeFindRes(post_view, this.state.personRes?.posts);
          this.setState(this.state);

          break;
        }

        case UserOperation.BanPerson: {
          const data = wsJsonToRes<BanPersonResponse>(msg);
          const res = this.state.personRes;
          res?.comments
            .filter(c => c.creator.id === data.person_view.person.id)
            .forEach(c => (c.creator.banned = data.banned));
          res?.posts
            .filter(c => c.creator.id === data.person_view.person.id)
            .forEach(c => (c.creator.banned = data.banned));
          const pv = res?.person_view;

          if (pv?.person.id === data.person_view.person.id) {
            pv.person.banned = data.banned;
          }
          this.setState(this.state);

          break;
        }

        case UserOperation.BlockPerson: {
          const data = wsJsonToRes<BlockPersonResponse>(msg);
          updatePersonBlock(data);
          this.setPersonBlock();

          break;
        }

        case UserOperation.PurgePerson:
        case UserOperation.PurgePost:
        case UserOperation.PurgeComment:
        case UserOperation.PurgeCommunity: {
          const { success } = wsJsonToRes<PurgeItemResponse>(msg);

          if (success) {
            toast(i18n.t("purge_success"));
            this.context.router.history.push(`/`);
          }
        }
      }
    }
  }
}
