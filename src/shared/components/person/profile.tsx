import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdminResponse,
  BanPerson,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  PostResponse,
  SortType,
  toUndefined,
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
  auth,
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
  getUsernameFromProps,
  isAdmin,
  isBanned,
  mdToHtml,
  numToSI,
  relTags,
  restoreScrollPosition,
  routeSortTypeToEnum,
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

interface ProfileState {
  personRes: Option<GetPersonDetailsResponse>;
  userName: string;
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  loading: boolean;
  personBlocked: boolean;
  banReason: Option<string>;
  banExpireDays: Option<number>;
  showBanDialog: boolean;
  removeData: boolean;
  siteRes: GetSiteResponse;
}

interface ProfileProps {
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  person_id: number | null;
  username: string;
}

interface UrlParams {
  view?: string;
  sort?: SortType;
  page?: number;
}

export class Profile extends Component<any, ProfileState> {
  private isoData = setIsoData(this.context, GetPersonDetailsResponse);
  private subscription: Subscription;
  private emptyState: ProfileState = {
    personRes: None,
    userName: getUsernameFromProps(this.props),
    loading: true,
    view: Profile.getViewFromProps(this.props.match.view),
    sort: Profile.getSortTypeFromProps(this.props.match.sort),
    page: Profile.getPageFromProps(this.props.match.page),
    personBlocked: false,
    siteRes: this.isoData.site_res,
    showBanDialog: false,
    banReason: null,
    banExpireDays: null,
    removeData: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleSortChange = this.handleSortChange.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.personRes = Some(
        this.isoData.routeData[0] as GetPersonDetailsResponse
      );
      this.state.loading = false;
    } else {
      this.fetchUserData();
    }

    this.setPersonBlock();
  }

  fetchUserData() {
    let form = new GetPersonDetails({
      username: Some(this.state.userName),
      person_id: None,
      community_id: None,
      sort: Some(this.state.sort),
      saved_only: Some(this.state.view === PersonDetailsView.Saved),
      page: Some(this.state.page),
      limit: Some(fetchLimit),
      auth: auth(false).ok(),
    });
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  get amCurrentUser() {
    return UserService.Instance.myUserInfo.match({
      some: mui =>
        this.state.personRes.match({
          some: res =>
            mui.local_user_view.person.id == res.person_view.person.id,
          none: false,
        }),
      none: false,
    });
  }

  setPersonBlock() {
    UserService.Instance.myUserInfo.match({
      some: mui =>
        this.state.personRes.match({
          some: res => {
            this.state.personBlocked = mui.person_blocks
              .map(a => a.target.id)
              .includes(res.person_view.person.id);
          },
          none: void 0,
        }),
      none: void 0,
    });
  }

  static getViewFromProps(view: string): PersonDetailsView {
    return view ? PersonDetailsView[view] : PersonDetailsView.Overview;
  }

  static getSortTypeFromProps(sort: string): SortType {
    return sort ? routeSortTypeToEnum(sort) : SortType.New;
  }

  static getPageFromProps(page: number): number {
    return page ? Number(page) : 1;
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");

    let username = pathSplit[2];
    let view = this.getViewFromProps(pathSplit[4]);
    let sort = Some(this.getSortTypeFromProps(pathSplit[6]));
    let page = Some(this.getPageFromProps(Number(pathSplit[8])));

    let form = new GetPersonDetails({
      username: Some(username),
      person_id: None,
      community_id: None,
      sort,
      saved_only: Some(view === PersonDetailsView.Saved),
      page,
      limit: Some(fetchLimit),
      auth: req.auth,
    });
    return [req.client.getPersonDetails(form)];
  }

  componentDidMount() {
    setupTippy();
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
    saveScrollPosition(this.context);
  }

  static getDerivedStateFromProps(props: any): ProfileProps {
    return {
      view: this.getViewFromProps(props.match.params.view),
      sort: this.getSortTypeFromProps(props.match.params.sort),
      page: this.getPageFromProps(props.match.params.page),
      person_id: Number(props.match.params.id) || null,
      username: props.match.params.username,
    };
  }

  componentDidUpdate(lastProps: any) {
    // Necessary if you are on a post and you click another post (same route)
    if (
      lastProps.location.pathname.split("/")[2] !==
      lastProps.history.location.pathname.split("/")[2]
    ) {
      // Couldnt get a refresh working. This does for now.
      location.reload();
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView =>
        this.state.personRes.match({
          some: res =>
            `@${res.person_view.person.name} - ${siteView.site.name}`,
          none: "",
        }),
      none: "",
    });
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          this.state.personRes.match({
            some: res => (
              <div class="row">
                <div class="col-12 col-md-8">
                  <>
                    <HtmlTags
                      title={this.documentTitle}
                      path={this.context.router.route.match.url}
                      description={res.person_view.person.bio}
                      image={res.person_view.person.avatar}
                    />
                    {this.userInfo()}
                    <hr />
                  </>
                  {!this.state.loading && this.selects()}
                  <PersonDetails
                    personRes={res}
                    admins={this.state.siteRes.admins}
                    sort={this.state.sort}
                    page={this.state.page}
                    limit={fetchLimit}
                    enableDownvotes={enableDownvotes(this.state.siteRes)}
                    enableNsfw={enableNsfw(this.state.siteRes)}
                    view={this.state.view}
                    onPageChange={this.handlePageChange}
                  />
                </div>

                {!this.state.loading && (
                  <div class="col-12 col-md-4">
                    {this.moderates()}
                    {this.amCurrentUser && this.follows()}
                  </div>
                )}
              </div>
            ),
            none: <></>,
          })
        )}
      </div>
    );
  }

  viewRadios() {
    return (
      <div class="btn-group btn-group-toggle flex-wrap mb-2">
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Overview && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Overview}
            checked={this.state.view === PersonDetailsView.Overview}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("overview")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Comments && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Comments}
            checked={this.state.view == PersonDetailsView.Comments}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("comments")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Posts && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Posts}
            checked={this.state.view == PersonDetailsView.Posts}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("posts")}
        </label>
        <label
          className={`btn btn-outline-secondary pointer
            ${this.state.view == PersonDetailsView.Saved && "active"}
          `}
        >
          <input
            type="radio"
            value={PersonDetailsView.Saved}
            checked={this.state.view == PersonDetailsView.Saved}
            onChange={linkEvent(this, this.handleViewChange)}
          />
          {i18n.t("saved")}
        </label>
      </div>
    );
  }

  selects() {
    let profileRss = `/feeds/u/${this.state.userName}.xml?sort=${this.state.sort}`;

    return (
      <div className="mb-2">
        <span class="mr-3">{this.viewRadios()}</span>
        <SortSelect
          sort={this.state.sort}
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
  handleBlockPerson(personId: number) {
    if (personId != 0) {
      let blockUserForm = new BlockPerson({
        person_id: personId,
        block: true,
        auth: auth().unwrap(),
      });
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }
  handleUnblockPerson(recipientId: number) {
    let blockUserForm = new BlockPerson({
      person_id: recipientId,
      block: false,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  userInfo() {
    return this.state.personRes
      .map(r => r.person_view)
      .match({
        some: pv => (
          <div>
            <BannerIconHeader
              banner={pv.person.banner}
              icon={pv.person.avatar}
            />
            <div class="mb-3">
              <div class="">
                <div class="mb-0 d-flex flex-wrap">
                  <div>
                    {pv.person.display_name && (
                      <h5 class="mb-0">{pv.person.display_name}</h5>
                    )}
                    <ul class="list-inline mb-2">
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
                  {this.banDialog()}
                  <div className="flex-grow-1 unselectable pointer mx-2"></div>
                  {!this.amCurrentUser &&
                    UserService.Instance.myUserInfo.isSome() && (
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
                          to={`/create_private_message/recipient/${pv.person.id}`}
                        >
                          {i18n.t("send_message")}
                        </Link>
                        {this.state.personBlocked ? (
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

                  {canMod(
                    None,
                    Some(this.state.siteRes.admins),
                    pv.person.id
                  ) &&
                    !isAdmin(Some(this.state.siteRes.admins), pv.person.id) &&
                    !this.state.showBanDialog &&
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
                {pv.person.bio.match({
                  some: bio => (
                    <div className="d-flex align-items-center mb-2">
                      <div
                        className="md-div"
                        dangerouslySetInnerHTML={mdToHtml(bio)}
                      />
                    </div>
                  ),
                  none: <></>,
                })}
                <div>
                  <ul class="list-inline mb-2">
                    <li className="list-inline-item badge badge-light">
                      {i18n.t("number_of_posts", {
                        count: pv.counts.post_count,
                        formattedCount: numToSI(pv.counts.post_count),
                      })}
                    </li>
                    <li className="list-inline-item badge badge-light">
                      {i18n.t("number_of_comments", {
                        count: pv.counts.comment_count,
                        formattedCount: numToSI(pv.counts.comment_count),
                      })}
                    </li>
                  </ul>
                </div>
                <div class="text-muted">
                  {i18n.t("joined")}{" "}
                  <MomentTime
                    published={pv.person.published}
                    updated={None}
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
              </div>
            </div>
          </div>
        ),
        none: <></>,
      });
  }

  banDialog() {
    return this.state.personRes
      .map(r => r.person_view)
      .match({
        some: pv => (
          <>
            {this.state.showBanDialog && (
              <form onSubmit={linkEvent(this, this.handleModBanSubmit)}>
                <div class="form-group row col-12">
                  <label class="col-form-label" htmlFor="profile-ban-reason">
                    {i18n.t("reason")}
                  </label>
                  <input
                    type="text"
                    id="profile-ban-reason"
                    class="form-control mr-2"
                    placeholder={i18n.t("reason")}
                    value={toUndefined(this.state.banReason)}
                    onInput={linkEvent(this, this.handleModBanReasonChange)}
                  />
                  <label class="col-form-label" htmlFor={`mod-ban-expires`}>
                    {i18n.t("expires")}
                  </label>
                  <input
                    type="number"
                    id={`mod-ban-expires`}
                    class="form-control mr-2"
                    placeholder={i18n.t("number_of_days")}
                    value={toUndefined(this.state.banExpireDays)}
                    onInput={linkEvent(this, this.handleModBanExpireDaysChange)}
                  />
                  <div class="form-group">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        id="mod-ban-remove-data"
                        type="checkbox"
                        checked={this.state.removeData}
                        onChange={linkEvent(
                          this,
                          this.handleModRemoveDataChange
                        )}
                      />
                      <label
                        class="form-check-label"
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
                <div class="form-group row">
                  <button
                    type="cancel"
                    class="btn btn-secondary mr-2"
                    aria-label={i18n.t("cancel")}
                    onClick={linkEvent(this, this.handleModBanSubmitCancel)}
                  >
                    {i18n.t("cancel")}
                  </button>
                  <button
                    type="submit"
                    class="btn btn-secondary"
                    aria-label={i18n.t("ban")}
                  >
                    {i18n.t("ban")} {pv.person.name}
                  </button>
                </div>
              </form>
            )}
          </>
        ),
        none: <></>,
      });
  }

  // TODO test this, make sure its good
  moderates() {
    return this.state.personRes
      .map(r => r.moderates)
      .match({
        some: moderates => {
          if (moderates.length > 0) {
            <div class="card border-secondary mb-3">
              <div class="card-body">
                <h5>{i18n.t("moderates")}</h5>
                <ul class="list-unstyled mb-0">
                  {moderates.map(cmv => (
                    <li>
                      <CommunityLink community={cmv.community} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>;
          }
        },
        none: void 0,
      });
  }

  follows() {
    return UserService.Instance.myUserInfo
      .map(m => m.follows)
      .match({
        some: follows => {
          if (follows.length > 0) {
            <div class="card border-secondary mb-3">
              <div class="card-body">
                <h5>{i18n.t("subscribed")}</h5>
                <ul class="list-unstyled mb-0">
                  {follows.map(cfv => (
                    <li>
                      <CommunityLink community={cfv.community} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>;
          }
        },
        none: void 0,
      });
  }

  updateUrl(paramUpdates: UrlParams) {
    const page = paramUpdates.page || this.state.page;
    const viewStr = paramUpdates.view || PersonDetailsView[this.state.view];
    const sortStr = paramUpdates.sort || this.state.sort;

    let typeView = `/u/${this.state.userName}`;

    this.props.history.push(
      `${typeView}/view/${viewStr}/sort/${sortStr}/page/${page}`
    );
    this.state.loading = true;
    this.setState(this.state);
    this.fetchUserData();
  }

  handlePageChange(page: number) {
    this.updateUrl({ page: page });
  }

  handleSortChange(val: SortType) {
    this.updateUrl({ sort: val, page: 1 });
  }

  handleViewChange(i: Profile, event: any) {
    i.updateUrl({
      view: PersonDetailsView[Number(event.target.value)],
      page: 1,
    });
  }

  handleModBanShow(i: Profile) {
    i.state.showBanDialog = true;
    i.setState(i.state);
  }

  handleModBanReasonChange(i: Profile, event: any) {
    i.state.banReason = event.target.value;
    i.setState(i.state);
  }

  handleModBanExpireDaysChange(i: Profile, event: any) {
    i.state.banExpireDays = event.target.value;
    i.setState(i.state);
  }

  handleModRemoveDataChange(i: Profile, event: any) {
    i.state.removeData = event.target.checked;
    i.setState(i.state);
  }

  handleModBanSubmitCancel(i: Profile, event?: any) {
    event.preventDefault();
    i.state.showBanDialog = false;
    i.setState(i.state);
  }

  handleModBanSubmit(i: Profile, event?: any) {
    if (event) event.preventDefault();

    i.state.personRes
      .map(r => r.person_view.person)
      .match({
        some: person => {
          // If its an unban, restore all their data
          let ban = !person.banned;
          if (ban == false) {
            i.state.removeData = false;
          }
          let form = new BanPerson({
            person_id: person.id,
            ban,
            remove_data: Some(i.state.removeData),
            reason: i.state.banReason,
            expires: i.state.banExpireDays.map(futureDaysToUnixTime),
            auth: auth().unwrap(),
          });
          WebSocketService.Instance.send(wsClient.banPerson(form));

          i.state.showBanDialog = false;
          i.setState(i.state);
        },
        none: void 0,
      });
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      if (msg.error == "couldnt_find_that_username_or_email") {
        this.context.router.history.push("/");
      }
      return;
    } else if (msg.reconnect) {
      this.fetchUserData();
    } else if (op == UserOperation.GetPersonDetails) {
      // Since the PersonDetails contains posts/comments as well as some general user info we listen here as well
      // and set the parent state if it is not set or differs
      // TODO this might need to get abstracted
      let data = wsJsonToRes<GetPersonDetailsResponse>(
        msg,
        GetPersonDetailsResponse
      );
      this.state.personRes = Some(data);
      this.state.loading = false;
      this.setPersonBlock();
      this.setState(this.state);
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg, AddAdminResponse);
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      createCommentLikeRes(
        data.comment_view,
        this.state.personRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      editCommentRes(
        data.comment_view,
        this.state.personRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      UserService.Instance.myUserInfo.match({
        some: mui => {
          if (data.comment_view.creator.id == mui.local_user_view.person.id) {
            toast(i18n.t("reply_sent"));
          }
        },
        none: void 0,
      });
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg, CommentResponse);
      saveCommentRes(
        data.comment_view,
        this.state.personRes.map(r => r.comments).unwrapOr([])
      );
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      editPostFindRes(
        data.post_view,
        this.state.personRes.map(r => r.posts).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg, PostResponse);
      createPostLikeFindRes(
        data.post_view,
        this.state.personRes.map(r => r.posts).unwrapOr([])
      );
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg, BanPersonResponse);
      this.state.personRes.match({
        some: res => {
          res.comments
            .filter(c => c.creator.id == data.person_view.person.id)
            .forEach(c => (c.creator.banned = data.banned));
          res.posts
            .filter(c => c.creator.id == data.person_view.person.id)
            .forEach(c => (c.creator.banned = data.banned));
          let pv = res.person_view;

          if (pv.person.id == data.person_view.person.id) {
            pv.person.banned = data.banned;
          }
          this.setState(this.state);
        },
        none: void 0,
      });
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg, BlockPersonResponse);
      updatePersonBlock(data);
      this.setPersonBlock();
      this.setState(this.state);
    }
  }
}
