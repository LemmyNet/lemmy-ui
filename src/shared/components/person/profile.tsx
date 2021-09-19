import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AddAdminResponse,
  BanPersonResponse,
  BlockPerson,
  BlockPersonResponse,
  CommentResponse,
  GetPersonDetails,
  GetPersonDetailsResponse,
  GetSiteResponse,
  PostResponse,
  SortType,
  UserOperation,
} from "lemmy-js-client";
import moment from "moment";
import { Subscription } from "rxjs";
import { i18n } from "../../i18next";
import { InitialFetchRequest, PersonDetailsView } from "../../interfaces";
import { UserService, WebSocketService } from "../../services";
import {
  authField,
  createCommentLikeRes,
  createPostLikeFindRes,
  editCommentRes,
  editPostFindRes,
  fetchLimit,
  getUsernameFromProps,
  mdToHtml,
  numToSI,
  previewLines,
  restoreScrollPosition,
  routeSortTypeToEnum,
  saveCommentRes,
  saveScrollPosition,
  setIsoData,
  setOptionalAuth,
  setupTippy,
  toast,
  updatePersonBlock,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
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
  personRes: GetPersonDetailsResponse;
  userName: string;
  view: PersonDetailsView;
  sort: SortType;
  page: number;
  loading: boolean;
  personBlocks: boolean;
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
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: ProfileState = {
    personRes: undefined,
    userName: getUsernameFromProps(this.props),
    loading: true,
    view: Profile.getViewFromProps(this.props.match.view),
    sort: Profile.getSortTypeFromProps(this.props.match.sort),
    page: Profile.getPageFromProps(this.props.match.page),
    personBlocks: false,
    siteRes: this.isoData.site_res,
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
      this.state.personRes = this.isoData.routeData[0];
      this.state.loading = false;
    } else {
      this.fetchUserData();
    }

    setupTippy();
  }

  fetchUserData() {
    let form: GetPersonDetails = {
      username: this.state.userName,
      sort: this.state.sort,
      saved_only: this.state.view === PersonDetailsView.Saved,
      page: this.state.page,
      limit: fetchLimit,
      auth: authField(false),
    };
    WebSocketService.Instance.send(wsClient.getPersonDetails(form));
  }

  get isCurrentUser() {
    return (
      UserService.Instance.myUserInfo?.local_user_view.person.id ==
      this.state.personRes.person_view.person.id
    );
  }
  get isBlocked() {
    this.state.personBlocks = UserService.Instance.myUserInfo.person_blocks.
    map(a => a.target.id).includes(this.state.personRes.person_view.person.id) 
    return this.state.personBlocks
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
    let promises: Promise<any>[] = [];

    // It can be /u/me, or /username/1
    let idOrName = pathSplit[2];
    let person_id: number;
    let username: string;
    if (isNaN(Number(idOrName))) {
      username = idOrName;
    } else {
      person_id = Number(idOrName);
    }

    let view = this.getViewFromProps(pathSplit[4]);
    let sort = this.getSortTypeFromProps(pathSplit[6]);
    let page = this.getPageFromProps(Number(pathSplit[8]));

    let form: GetPersonDetails = {
      sort,
      saved_only: view === PersonDetailsView.Saved,
      page,
      limit: fetchLimit,
    };
    setOptionalAuth(form, req.auth);
    this.setIdOrName(form, person_id, username);
    promises.push(req.client.getPersonDetails(form));
    return promises;
  }

  static setIdOrName(obj: any, id: number, name_: string) {
    if (id) {
      obj.person_id = id;
    } else {
      obj.username = name_;
    }
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
    return `@${this.state.personRes.person_view.person.name} - ${this.state.siteRes.site_view.site.name}`;
  }

  get bioTag(): string {
    return this.state.personRes.person_view.person.bio
      ? previewLines(this.state.personRes.person_view.person.bio)
      : undefined;
  }

  render() {
    return (
      <div class="container">
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div class="row">
            <div class="col-12 col-md-8">
              <>
                <HtmlTags
                  title={this.documentTitle}
                  path={this.context.router.route.match.url}
                  description={this.bioTag}
                  image={this.state.personRes.person_view.person.avatar}
                />
                {this.userInfo()}
                <hr />
              </>
              {!this.state.loading && this.selects()}
              <PersonDetails
                personRes={this.state.personRes}
                admins={this.state.siteRes.admins}
                sort={this.state.sort}
                page={this.state.page}
                limit={fetchLimit}
                enableDownvotes={
                  this.state.siteRes.site_view.site.enable_downvotes
                }
                enableNsfw={this.state.siteRes.site_view.site.enable_nsfw}
                view={this.state.view}
                onPageChange={this.handlePageChange}
              />
            </div>

            {!this.state.loading && (
              <div class="col-12 col-md-4">
                {this.moderates()}
                {this.isCurrentUser && this.follows()}
              </div>
            )}
          </div>
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
    return (
      <div className="mb-2">
        <span class="mr-3">{this.viewRadios()}</span>
        <SortSelect
          sort={this.state.sort}
          onChange={this.handleSortChange}
          hideHot
          hideMostComments
        />
        <a
          href={`/feeds/u/${this.state.userName}.xml?sort=${this.state.sort}`}
          rel="noopener"
          title="RSS"
        >
          <Icon icon="rss" classes="text-muted small mx-2" />
        </a>
      </div>
    );
  }
  handleBlockPerson(personId: number) {
    if (personId != 0) {
      let blockUserForm: BlockPerson = {
        person_id: personId,
        block: true,
        auth: authField(),
      };
      WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
    }
  }
  handleUnblockPerson(recipientId: number ) {
    let blockUserForm: BlockPerson = {
      person_id: recipientId,
      block: false,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.blockPerson(blockUserForm));
  }

  userInfo() {
    let pv = this.state.personRes?.person_view;

    return (
      <div>
        <BannerIconHeader banner={pv.person.banner} icon={pv.person.avatar} />
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
                  {pv.person.banned && (
                    <li className="list-inline-item badge badge-danger">
                      {i18n.t("banned")}
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex-grow-1 unselectable pointer mx-2"></div>
              {!this.isCurrentUser && (
                <>
                  <a
                    className={`d-flex align-self-start btn btn-secondary mr-2 ${
                      !pv.person.matrix_user_id && "invisible"
                    }`}
                    rel="noopener"
                    href={`https://matrix.to/#/${pv.person.matrix_user_id}`}
                  >
                    {i18n.t("send_secure_message")}
                  </a>
                  <Link
                    className={"d-flex align-self-start btn btn-secondary mr-2"}
                    to={`/create_private_message/recipient/${pv.person.id}`}
                  >
                    {i18n.t("send_message")}
                  </Link>
                  {this.isBlocked ?  
                   (
                  <a
                    className={"d-flex align-self-start btn btn-secondary"}
                    onClick={linkEvent(pv.person.id, this.handleUnblockPerson)}
                    href="#"
                  >
                    {i18n.t("unblock_user")}
                  </a>
                  ) :
                  (
                    <a
                      className={"d-flex align-self-start btn btn-secondary"}
                      onClick={linkEvent(pv.person.id, this.handleBlockPerson)}
                      href="#"
                    >
                      {i18n.t("block_user")}
                    </a>
                  )}
                </>
              )}
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
              <MomentTime data={pv.person} showAgo ignoreUpdated />
            </div>
            <div className="d-flex align-items-center text-muted mb-2">
              <Icon icon="cake" />
              <span className="ml-2">
                {i18n.t("cake_day_title")}{" "}
                {moment.utc(pv.person.published).local().format("MMM DD, YYYY")}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  moderates() {
    return (
      <div>
        {this.state.personRes.moderates.length > 0 && (
          <div class="card border-secondary mb-3">
            <div class="card-body">
              <h5>{i18n.t("moderates")}</h5>
              <ul class="list-unstyled mb-0">
                {this.state.personRes.moderates.map(cmv => (
                  <li>
                    <CommunityLink community={cmv.community} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  follows() {
    let follows = UserService.Instance.myUserInfo.follows;
    return (
      <div>
        {follows.length > 0 && (
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
          </div>
        )}
      </div>
    );
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
    this.updateUrl({ page });
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
      let data = wsJsonToRes<GetPersonDetailsResponse>(msg).data;
      this.state.personRes = data;
      console.log(data);
      this.state.loading = false;
      this.setState(this.state);
      restoreScrollPosition(this.context);
    } else if (op == UserOperation.AddAdmin) {
      let data = wsJsonToRes<AddAdminResponse>(msg).data;
      this.state.siteRes.admins = data.admins;
      this.setState(this.state);
    } else if (op == UserOperation.CreateCommentLike) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      createCommentLikeRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditComment ||
      op == UserOperation.DeleteComment ||
      op == UserOperation.RemoveComment
    ) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      editCommentRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (op == UserOperation.CreateComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      if (
        UserService.Instance.myUserInfo &&
        data.comment_view.creator.id ==
          UserService.Instance.myUserInfo.local_user_view.person.id
      ) {
        toast(i18n.t("reply_sent"));
      }
    } else if (op == UserOperation.SaveComment) {
      let data = wsJsonToRes<CommentResponse>(msg).data;
      saveCommentRes(data.comment_view, this.state.personRes.comments);
      this.setState(this.state);
    } else if (
      op == UserOperation.EditPost ||
      op == UserOperation.DeletePost ||
      op == UserOperation.RemovePost ||
      op == UserOperation.LockPost ||
      op == UserOperation.StickyPost ||
      op == UserOperation.SavePost
    ) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      editPostFindRes(data.post_view, this.state.personRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.CreatePostLike) {
      let data = wsJsonToRes<PostResponse>(msg).data;
      createPostLikeFindRes(data.post_view, this.state.personRes.posts);
      this.setState(this.state);
    } else if (op == UserOperation.BanPerson) {
      let data = wsJsonToRes<BanPersonResponse>(msg).data;
      this.state.personRes.comments
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.state.personRes.posts
        .filter(c => c.creator.id == data.person_view.person.id)
        .forEach(c => (c.creator.banned = data.banned));
      this.setState(this.state);
    } else if (op == UserOperation.BlockPerson) {
      let data = wsJsonToRes<BlockPersonResponse>(msg).data;
      updatePersonBlock(data);
      this.setState(this.state);
    } 
  }
}
