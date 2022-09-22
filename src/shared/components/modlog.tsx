import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { Link } from "inferno-router";
import {
  AdminPurgeCommentView,
  AdminPurgeCommunityView,
  AdminPurgePersonView,
  AdminPurgePostView,
  CommunityModeratorView,
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  GetModlogResponse,
  GetSiteResponse,
  ModAddCommunityView,
  ModAddView,
  ModBanFromCommunityView,
  ModBanView,
  ModLockPostView,
  ModlogActionType,
  ModRemoveCommentView,
  ModRemoveCommunityView,
  ModRemovePostView,
  ModStickyPostView,
  ModTransferCommunityView,
  PersonSafe,
  toUndefined,
  UserOperation,
  wsJsonToRes,
  wsUserOp,
} from "lemmy-js-client";
import moment from "moment";
import { Subscription } from "rxjs";
import { i18n } from "../i18next";
import { InitialFetchRequest } from "../interfaces";
import { WebSocketService } from "../services";
import {
  amAdmin,
  amMod,
  auth,
  choicesModLogConfig,
  debounce,
  fetchLimit,
  fetchUsers,
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsSubscribe,
} from "../utils";
import { HtmlTags } from "./common/html-tags";
import { Spinner } from "./common/icon";
import { MomentTime } from "./common/moment-time";
import { Paginator } from "./common/paginator";
import { CommunityLink } from "./community/community-link";
import { PersonListing } from "./person/person-listing";
type ModlogType = {
  id: number;
  type_: ModlogActionType;
  moderator: Option<PersonSafe>;
  view:
    | ModRemovePostView
    | ModLockPostView
    | ModStickyPostView
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
  when_: string;
};
var Choices: any;
if (isBrowser()) {
  Choices = require("choices.js");
}

interface ModlogState {
  res: Option<GetModlogResponse>;
  communityId: Option<number>;
  communityMods: Option<CommunityModeratorView[]>;
  communityName: Option<string>;
  page: number;
  siteRes: GetSiteResponse;
  loading: boolean;
  filter_action: ModlogActionType;
  filter_user: Option<number>;
  filter_mod: Option<number>;
}

export class Modlog extends Component<any, ModlogState> {
  private isoData = setIsoData(
    this.context,
    GetModlogResponse,
    GetCommunityResponse
  );
  private subscription: Subscription;
  private userChoices: any;
  private modChoices: any;
  private emptyState: ModlogState = {
    res: None,
    communityId: None,
    communityMods: None,
    communityName: None,
    page: 1,
    loading: true,
    siteRes: this.isoData.site_res,
    filter_action: ModlogActionType.All,
    filter_user: None,
    filter_mod: None,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    this.state = {
      ...this.state,
      communityId: this.props.match.params.community_id
        ? Some(Number(this.props.match.params.community_id))
        : None,
    };

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state = {
        ...this.state,
        res: Some(this.isoData.routeData[0] as GetModlogResponse),
      };

      if (this.isoData.routeData[1]) {
        // Getting the moderators
        let communityRes = Some(
          this.isoData.routeData[1] as GetCommunityResponse
        );
        this.state = {
          ...this.state,
          communityMods: communityRes.map(c => c.moderators),
        };
      }

      this.state = { ...this.state, loading: false };
    } else {
      this.refetch();
    }
  }

  componentDidMount() {
    this.setupUserFilter();
    this.setupModFilter();
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  buildCombined(res: GetModlogResponse): ModlogType[] {
    let removed_posts: ModlogType[] = res.removed_posts.map(r => ({
      id: r.mod_remove_post.id,
      type_: ModlogActionType.ModRemovePost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_post.when_,
    }));

    let locked_posts: ModlogType[] = res.locked_posts.map(r => ({
      id: r.mod_lock_post.id,
      type_: ModlogActionType.ModLockPost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_lock_post.when_,
    }));

    let stickied_posts: ModlogType[] = res.stickied_posts.map(r => ({
      id: r.mod_sticky_post.id,
      type_: ModlogActionType.ModStickyPost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_sticky_post.when_,
    }));

    let removed_comments: ModlogType[] = res.removed_comments.map(r => ({
      id: r.mod_remove_comment.id,
      type_: ModlogActionType.ModRemoveComment,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_comment.when_,
    }));

    let removed_communities: ModlogType[] = res.removed_communities.map(r => ({
      id: r.mod_remove_community.id,
      type_: ModlogActionType.ModRemoveCommunity,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_community.when_,
    }));

    let banned_from_community: ModlogType[] = res.banned_from_community.map(
      r => ({
        id: r.mod_ban_from_community.id,
        type_: ModlogActionType.ModBanFromCommunity,
        view: r,
        moderator: r.moderator,
        when_: r.mod_ban_from_community.when_,
      })
    );

    let added_to_community: ModlogType[] = res.added_to_community.map(r => ({
      id: r.mod_add_community.id,
      type_: ModlogActionType.ModAddCommunity,
      view: r,
      moderator: r.moderator,
      when_: r.mod_add_community.when_,
    }));

    let transferred_to_community: ModlogType[] =
      res.transferred_to_community.map(r => ({
        id: r.mod_transfer_community.id,
        type_: ModlogActionType.ModTransferCommunity,
        view: r,
        moderator: r.moderator,
        when_: r.mod_transfer_community.when_,
      }));

    let added: ModlogType[] = res.added.map(r => ({
      id: r.mod_add.id,
      type_: ModlogActionType.ModAdd,
      view: r,
      moderator: r.moderator,
      when_: r.mod_add.when_,
    }));

    let banned: ModlogType[] = res.banned.map(r => ({
      id: r.mod_ban.id,
      type_: ModlogActionType.ModBan,
      view: r,
      moderator: r.moderator,
      when_: r.mod_ban.when_,
    }));

    let purged_persons: ModlogType[] = res.admin_purged_persons.map(r => ({
      id: r.admin_purge_person.id,
      type_: ModlogActionType.AdminPurgePerson,
      view: r,
      moderator: r.admin,
      when_: r.admin_purge_person.when_,
    }));

    let purged_communities: ModlogType[] = res.admin_purged_communities.map(
      r => ({
        id: r.admin_purge_community.id,
        type_: ModlogActionType.AdminPurgeCommunity,
        view: r,
        moderator: r.admin,
        when_: r.admin_purge_community.when_,
      })
    );

    let purged_posts: ModlogType[] = res.admin_purged_posts.map(r => ({
      id: r.admin_purge_post.id,
      type_: ModlogActionType.AdminPurgePost,
      view: r,
      moderator: r.admin,
      when_: r.admin_purge_post.when_,
    }));

    let purged_comments: ModlogType[] = res.admin_purged_comments.map(r => ({
      id: r.admin_purge_comment.id,
      type_: ModlogActionType.AdminPurgeComment,
      view: r,
      moderator: r.admin,
      when_: r.admin_purge_comment.when_,
    }));

    let combined: ModlogType[] = [];

    combined.push(...removed_posts);
    combined.push(...locked_posts);
    combined.push(...stickied_posts);
    combined.push(...removed_comments);
    combined.push(...removed_communities);
    combined.push(...banned_from_community);
    combined.push(...added_to_community);
    combined.push(...transferred_to_community);
    combined.push(...added);
    combined.push(...banned);
    combined.push(...purged_persons);
    combined.push(...purged_communities);
    combined.push(...purged_posts);
    combined.push(...purged_comments);

    // Sort them by time
    combined.sort((a, b) => b.when_.localeCompare(a.when_));

    return combined;
  }

  renderModlogType(i: ModlogType) {
    switch (i.type_) {
      case ModlogActionType.ModRemovePost: {
        let mrpv = i.view as ModRemovePostView;
        return (
          <>
            <span>
              {mrpv.mod_remove_post.removed.unwrapOr(false)
                ? "Removed "
                : "Restored "}
            </span>
            <span>
              Post <Link to={`/post/${mrpv.post.id}`}>{mrpv.post.name}</Link>
            </span>
            <span>
              {mrpv.mod_remove_post.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.ModLockPost: {
        let mlpv = i.view as ModLockPostView;
        return (
          <>
            <span>
              {mlpv.mod_lock_post.locked.unwrapOr(false)
                ? "Locked "
                : "Unlocked "}
            </span>
            <span>
              Post <Link to={`/post/${mlpv.post.id}`}>{mlpv.post.name}</Link>
            </span>
          </>
        );
      }
      case ModlogActionType.ModStickyPost: {
        let mspv = i.view as ModStickyPostView;
        return (
          <>
            <span>
              {mspv.mod_sticky_post.stickied.unwrapOr(false)
                ? "Stickied "
                : "Unstickied "}
            </span>
            <span>
              Post <Link to={`/post/${mspv.post.id}`}>{mspv.post.name}</Link>
            </span>
          </>
        );
      }
      case ModlogActionType.ModRemoveComment: {
        let mrc = i.view as ModRemoveCommentView;
        return (
          <>
            <span>
              {mrc.mod_remove_comment.removed.unwrapOr(false)
                ? "Removed "
                : "Restored "}
            </span>
            <span>
              Comment{" "}
              <Link to={`/post/${mrc.post.id}/comment/${mrc.comment.id}`}>
                {mrc.comment.content}
              </Link>
            </span>
            <span>
              {" "}
              by <PersonListing person={mrc.commenter} />
            </span>
            <span>
              {mrc.mod_remove_comment.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.ModRemoveCommunity: {
        let mrco = i.view as ModRemoveCommunityView;
        return (
          <>
            <span>
              {mrco.mod_remove_community.removed.unwrapOr(false)
                ? "Removed "
                : "Restored "}
            </span>
            <span>
              Community <CommunityLink community={mrco.community} />
            </span>
            <span>
              {mrco.mod_remove_community.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
            <span>
              {mrco.mod_remove_community.expires.match({
                some: expires => (
                  <div>expires: {moment.utc(expires).fromNow()}</div>
                ),
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.ModBanFromCommunity: {
        let mbfc = i.view as ModBanFromCommunityView;
        return (
          <>
            <span>
              {mbfc.mod_ban_from_community.banned.unwrapOr(false)
                ? "Banned "
                : "Unbanned "}{" "}
            </span>
            <span>
              <PersonListing person={mbfc.banned_person} />
            </span>
            <span> from the community </span>
            <span>
              <CommunityLink community={mbfc.community} />
            </span>
            <span>
              {mbfc.mod_ban_from_community.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
            <span>
              {mbfc.mod_ban_from_community.expires.match({
                some: expires => (
                  <div>expires: {moment.utc(expires).fromNow()}</div>
                ),
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.ModAddCommunity: {
        let mac = i.view as ModAddCommunityView;
        return (
          <>
            <span>
              {mac.mod_add_community.removed.unwrapOr(false)
                ? "Removed "
                : "Appointed "}{" "}
            </span>
            <span>
              <PersonListing person={mac.modded_person} />
            </span>
            <span> as a mod to the community </span>
            <span>
              <CommunityLink community={mac.community} />
            </span>
          </>
        );
      }
      case ModlogActionType.ModTransferCommunity: {
        let mtc = i.view as ModTransferCommunityView;
        return (
          <>
            <span>
              {mtc.mod_transfer_community.removed.unwrapOr(false)
                ? "Removed "
                : "Transferred "}{" "}
            </span>
            <span>
              <CommunityLink community={mtc.community} />
            </span>
            <span> to </span>
            <span>
              <PersonListing person={mtc.modded_person} />
            </span>
          </>
        );
      }
      case ModlogActionType.ModBan: {
        let mb = i.view as ModBanView;
        return (
          <>
            <span>
              {mb.mod_ban.banned.unwrapOr(false) ? "Banned " : "Unbanned "}{" "}
            </span>
            <span>
              <PersonListing person={mb.banned_person} />
            </span>
            <span>
              {mb.mod_ban.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
            <span>
              {mb.mod_ban.expires.match({
                some: expires => (
                  <div>expires: {moment.utc(expires).fromNow()}</div>
                ),
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.ModAdd: {
        let ma = i.view as ModAddView;
        return (
          <>
            <span>
              {ma.mod_add.removed.unwrapOr(false) ? "Removed " : "Appointed "}{" "}
            </span>
            <span>
              <PersonListing person={ma.modded_person} />
            </span>
            <span> as an admin </span>
          </>
        );
      }
      case ModlogActionType.AdminPurgePerson: {
        let ap = i.view as AdminPurgePersonView;
        return (
          <>
            <span>Purged a Person</span>
            <span>
              {ap.admin_purge_person.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.AdminPurgeCommunity: {
        let ap = i.view as AdminPurgeCommunityView;
        return (
          <>
            <span>Purged a Community</span>
            <span>
              {ap.admin_purge_community.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.AdminPurgePost: {
        let ap = i.view as AdminPurgePostView;
        return (
          <>
            <span>Purged a Post from from </span>
            <CommunityLink community={ap.community} />
            <span>
              {ap.admin_purge_post.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      case ModlogActionType.AdminPurgeComment: {
        let ap = i.view as AdminPurgeCommentView;
        return (
          <>
            <span>
              Purged a Comment from{" "}
              <Link to={`/post/${ap.post.id}`}>{ap.post.name}</Link>
            </span>
            <span>
              {ap.admin_purge_comment.reason.match({
                some: reason => <div>reason: {reason}</div>,
                none: <></>,
              })}
            </span>
          </>
        );
      }
      default:
        return <div />;
    }
  }

  combined() {
    let combined = this.state.res.map(this.buildCombined).unwrapOr([]);

    return (
      <tbody>
        {combined.map(i => (
          <tr key={i.id}>
            <td>
              <MomentTime published={i.when_} updated={None} />
            </td>
            <td>
              {this.amAdminOrMod ? (
                <PersonListing person={i.moderator.unwrap()} />
              ) : (
                <div>{this.modOrAdminText(i.moderator)}</div>
              )}
            </td>
            <td>{this.renderModlogType(i)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  get amAdminOrMod(): boolean {
    return (
      amAdmin(Some(this.state.siteRes.admins)) ||
      amMod(this.state.communityMods)
    );
  }

  modOrAdminText(person: Option<PersonSafe>): string {
    return person.match({
      some: res =>
        this.isoData.site_res.admins.map(a => a.person.id).includes(res.id)
          ? i18n.t("admin")
          : i18n.t("mod"),
      none: i18n.t("mod"),
    });
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView => `Modlog - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div className="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
          description={None}
          image={None}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            <h5>
              {this.state.communityName.match({
                some: name => (
                  <Link className="text-body" to={`/c/${name}`}>
                    /c/{name}{" "}
                  </Link>
                ),
                none: <></>,
              })}
              <span>{i18n.t("modlog")}</span>
            </h5>
            <div className="form-row">
              <div className="form-group col-sm-6">
                <select
                  value={this.state.filter_action}
                  onChange={linkEvent(this, this.handleFilterActionChange)}
                  className="custom-select mb-2"
                  aria-label="action"
                >
                  <option disabled aria-hidden="true">
                    {i18n.t("filter_by_action")}
                  </option>
                  <option value={ModlogActionType.All}>{i18n.t("all")}</option>
                  <option value={ModlogActionType.ModRemovePost}>
                    Removing Posts
                  </option>
                  <option value={ModlogActionType.ModLockPost}>
                    Locking Posts
                  </option>
                  <option value={ModlogActionType.ModStickyPost}>
                    Stickying Posts
                  </option>
                  <option value={ModlogActionType.ModRemoveComment}>
                    Removing Comments
                  </option>
                  <option value={ModlogActionType.ModRemoveCommunity}>
                    Removing Communities
                  </option>
                  <option value={ModlogActionType.ModBanFromCommunity}>
                    Banning From Communities
                  </option>
                  <option value={ModlogActionType.ModAddCommunity}>
                    Adding Mod to Community
                  </option>
                  <option value={ModlogActionType.ModTransferCommunity}>
                    Transfering Communities
                  </option>
                  <option value={ModlogActionType.ModAdd}>
                    Adding Mod to Site
                  </option>
                  <option value={ModlogActionType.ModBan}>
                    Banning From Site
                  </option>
                </select>
              </div>
              {this.state.siteRes.site_view.match({
                some: site_view =>
                  !site_view.site.hide_modlog_mod_names.unwrapOr(false) && (
                    <div className="form-group col-sm-6">
                      <select
                        id="filter-mod"
                        className="form-control"
                        value={toUndefined(this.state.filter_mod)}
                      >
                        <option>{i18n.t("filter_by_mod")}</option>
                      </select>
                    </div>
                  ),
                none: <></>,
              })}
              <div className="form-group col-sm-6">
                <select
                  id="filter-user"
                  className="form-control"
                  value={toUndefined(this.state.filter_user)}
                >
                  <option>{i18n.t("filter_by_user")}</option>
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table id="modlog_table" className="table table-sm table-hover">
                <thead className="pointer">
                  <tr>
                    <th> {i18n.t("time")}</th>
                    <th>{i18n.t("mod")}</th>
                    <th>{i18n.t("action")}</th>
                  </tr>
                </thead>
                {this.combined()}
              </table>
              <Paginator
                page={this.state.page}
                onChange={this.handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  handleFilterActionChange(i: Modlog, event: any) {
    i.setState({ filter_action: event.target.value });
    i.refetch();
  }

  handlePageChange(val: number) {
    this.setState({ page: val });
    this.refetch();
  }

  refetch() {
    let modlogForm = new GetModlog({
      community_id: this.state.communityId,
      page: Some(this.state.page),
      limit: Some(fetchLimit),
      auth: auth(false).ok(),
      type_: this.state.filter_action,
      other_person_id: this.state.filter_user,
      mod_person_id: this.state.filter_mod,
    });
    WebSocketService.Instance.send(wsClient.getModlog(modlogForm));

    this.state.communityId.match({
      some: id => {
        let communityForm = new GetCommunity({
          id: Some(id),
          name: None,
          auth: auth(false).ok(),
        });
        WebSocketService.Instance.send(wsClient.getCommunity(communityForm));
      },
      none: void 0,
    });
  }

  setupUserFilter() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("filter-user");
      if (selectId) {
        this.userChoices = new Choices(selectId, choicesModLogConfig);
        this.userChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.setState({ filter_user: Some(Number(e.detail.choice.value)) });
            this.refetch();
          },
          false
        );
        this.userChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let users = (await fetchUsers(e.detail.value)).users;
              this.userChoices.setChoices(
                users.map(u => {
                  return {
                    value: u.person.id.toString(),
                    label: u.person.name,
                  };
                }),
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          }),
          false
        );
      }
    }
  }

  setupModFilter() {
    if (isBrowser()) {
      let selectId: any = document.getElementById("filter-mod");
      if (selectId) {
        this.modChoices = new Choices(selectId, choicesModLogConfig);
        this.modChoices.passedElement.element.addEventListener(
          "choice",
          (e: any) => {
            this.setState({ filter_mod: Some(Number(e.detail.choice.value)) });
            this.refetch();
          },
          false
        );
        this.modChoices.passedElement.element.addEventListener(
          "search",
          debounce(async (e: any) => {
            try {
              let mods = (await fetchUsers(e.detail.value)).users;
              this.modChoices.setChoices(
                mods.map(u => {
                  return {
                    value: u.person.id.toString(),
                    label: u.person.name,
                  };
                }),
                "value",
                "label",
                true
              );
            } catch (err) {
              console.log(err);
            }
          }),
          false
        );
      }
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let communityId = Some(pathSplit[3]).map(Number);
    let promises: Promise<any>[] = [];

    let modlogForm = new GetModlog({
      page: Some(1),
      limit: Some(fetchLimit),
      community_id: communityId,
      mod_person_id: None,
      auth: req.auth,
      type_: ModlogActionType.All,
      other_person_id: None,
    });

    promises.push(req.client.getModlog(modlogForm));

    if (communityId.isSome()) {
      let communityForm = new GetCommunity({
        id: communityId,
        name: None,
        auth: req.auth,
      });
      promises.push(req.client.getCommunity(communityForm));
    } else {
      promises.push(Promise.resolve());
    }
    return promises;
  }

  parseMessage(msg: any) {
    let op = wsUserOp(msg);
    console.log(msg);
    if (msg.error) {
      toast(i18n.t(msg.error), "danger");
      return;
    } else if (op == UserOperation.GetModlog) {
      let data = wsJsonToRes<GetModlogResponse>(msg, GetModlogResponse);
      window.scrollTo(0, 0);
      this.setState({ res: Some(data), loading: false });
      this.setupUserFilter();
      this.setupModFilter();
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg, GetCommunityResponse);
      this.setState({
        communityMods: Some(data.moderators),
        communityName: Some(data.community_view.community.name),
      });
    }
  }
}
