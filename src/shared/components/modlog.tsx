import { None, Option, Some } from "@sniptt/monads";
import { Component } from "inferno";
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
  ModRemoveCommentView,
  ModRemoveCommunityView,
  ModRemovePostView,
  ModStickyPostView,
  ModTransferCommunityView,
  PersonSafe,
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
  fetchLimit,
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

enum ModlogEnum {
  ModRemovePost,
  ModLockPost,
  ModStickyPost,
  ModRemoveComment,
  ModRemoveCommunity,
  ModBanFromCommunity,
  ModAddCommunity,
  ModTransferCommunity,
  ModAdd,
  ModBan,
  AdminPurgePerson,
  AdminPurgeCommunity,
  AdminPurgePost,
  AdminPurgeComment,
}

type ModlogType = {
  id: number;
  type_: ModlogEnum;
  moderator: PersonSafe;
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

interface ModlogState {
  res: Option<GetModlogResponse>;
  communityId: Option<number>;
  communityMods: Option<CommunityModeratorView[]>;
  page: number;
  siteRes: GetSiteResponse;
  loading: boolean;
}

export class Modlog extends Component<any, ModlogState> {
  private isoData = setIsoData(
    this.context,
    GetModlogResponse,
    GetCommunityResponse
  );
  private subscription: Subscription;
  private emptyState: ModlogState = {
    res: None,
    communityId: None,
    communityMods: None,
    page: 1,
    loading: true,
    siteRes: this.isoData.site_res,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    this.state.communityId = this.props.match.params.community_id
      ? Some(Number(this.props.match.params.community_id))
      : None;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      this.state.res = Some(this.isoData.routeData[0] as GetModlogResponse);

      if (this.isoData.routeData[1]) {
        // Getting the moderators
        let communityRes = Some(
          this.isoData.routeData[1] as GetCommunityResponse
        );
        this.state.communityMods = communityRes.map(c => c.moderators);
      }

      this.state.loading = false;
    } else {
      this.refetch();
    }
  }

  componentWillUnmount() {
    if (isBrowser()) {
      this.subscription.unsubscribe();
    }
  }

  buildCombined(res: GetModlogResponse): ModlogType[] {
    let removed_posts: ModlogType[] = res.removed_posts.map(r => ({
      id: r.mod_remove_post.id,
      type_: ModlogEnum.ModRemovePost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_post.when_,
    }));

    let locked_posts: ModlogType[] = res.locked_posts.map(r => ({
      id: r.mod_lock_post.id,
      type_: ModlogEnum.ModLockPost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_lock_post.when_,
    }));

    let stickied_posts: ModlogType[] = res.stickied_posts.map(r => ({
      id: r.mod_sticky_post.id,
      type_: ModlogEnum.ModStickyPost,
      view: r,
      moderator: r.moderator,
      when_: r.mod_sticky_post.when_,
    }));

    let removed_comments: ModlogType[] = res.removed_comments.map(r => ({
      id: r.mod_remove_comment.id,
      type_: ModlogEnum.ModRemoveComment,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_comment.when_,
    }));

    let removed_communities: ModlogType[] = res.removed_communities.map(r => ({
      id: r.mod_remove_community.id,
      type_: ModlogEnum.ModRemoveCommunity,
      view: r,
      moderator: r.moderator,
      when_: r.mod_remove_community.when_,
    }));

    let banned_from_community: ModlogType[] = res.banned_from_community.map(
      r => ({
        id: r.mod_ban_from_community.id,
        type_: ModlogEnum.ModBanFromCommunity,
        view: r,
        moderator: r.moderator,
        when_: r.mod_ban_from_community.when_,
      })
    );

    let added_to_community: ModlogType[] = res.added_to_community.map(r => ({
      id: r.mod_add_community.id,
      type_: ModlogEnum.ModAddCommunity,
      view: r,
      moderator: r.moderator,
      when_: r.mod_add_community.when_,
    }));

    let transferred_to_community: ModlogType[] =
      res.transferred_to_community.map(r => ({
        id: r.mod_transfer_community.id,
        type_: ModlogEnum.ModTransferCommunity,
        view: r,
        moderator: r.moderator,
        when_: r.mod_transfer_community.when_,
      }));

    let added: ModlogType[] = res.added.map(r => ({
      id: r.mod_add.id,
      type_: ModlogEnum.ModAdd,
      view: r,
      moderator: r.moderator,
      when_: r.mod_add.when_,
    }));

    let banned: ModlogType[] = res.banned.map(r => ({
      id: r.mod_ban.id,
      type_: ModlogEnum.ModBan,
      view: r,
      moderator: r.moderator,
      when_: r.mod_ban.when_,
    }));

    let purged_persons: ModlogType[] = res.admin_purged_persons.map(r => ({
      id: r.admin_purge_person.id,
      type_: ModlogEnum.AdminPurgePerson,
      view: r,
      moderator: r.admin,
      when_: r.admin_purge_person.when_,
    }));

    let purged_communities: ModlogType[] = res.admin_purged_communities.map(
      r => ({
        id: r.admin_purge_community.id,
        type_: ModlogEnum.AdminPurgeCommunity,
        view: r,
        moderator: r.admin,
        when_: r.admin_purge_community.when_,
      })
    );

    let purged_posts: ModlogType[] = res.admin_purged_posts.map(r => ({
      id: r.admin_purge_post.id,
      type_: ModlogEnum.AdminPurgePost,
      view: r,
      moderator: r.admin,
      when_: r.admin_purge_post.when_,
    }));

    let purged_comments: ModlogType[] = res.admin_purged_comments.map(r => ({
      id: r.admin_purge_comment.id,
      type_: ModlogEnum.AdminPurgeComment,
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
      case ModlogEnum.ModRemovePost: {
        let mrpv = i.view as ModRemovePostView;
        return [
          mrpv.mod_remove_post.removed.unwrapOr(false)
            ? "Removed "
            : "Restored ",
          <span>
            Post <Link to={`/post/${mrpv.post.id}`}>{mrpv.post.name}</Link>
          </span>,
          mrpv.mod_remove_post.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.ModLockPost: {
        let mlpv = i.view as ModLockPostView;
        return [
          mlpv.mod_lock_post.locked.unwrapOr(false) ? "Locked " : "Unlocked ",
          <span>
            Post <Link to={`/post/${mlpv.post.id}`}>{mlpv.post.name}</Link>
          </span>,
        ];
      }
      case ModlogEnum.ModStickyPost: {
        let mspv = i.view as ModStickyPostView;
        return [
          mspv.mod_sticky_post.stickied.unwrapOr(false)
            ? "Stickied "
            : "Unstickied ",
          <span>
            Post <Link to={`/post/${mspv.post.id}`}>{mspv.post.name}</Link>
          </span>,
        ];
      }
      case ModlogEnum.ModRemoveComment: {
        let mrc = i.view as ModRemoveCommentView;
        return [
          mrc.mod_remove_comment.removed.unwrapOr(false)
            ? "Removed "
            : "Restored ",
          <span>
            Comment{" "}
            <Link to={`/post/${mrc.post.id}/comment/${mrc.comment.id}`}>
              {mrc.comment.content}
            </Link>
          </span>,
          <span>
            {" "}
            by <PersonListing person={mrc.commenter} />
          </span>,
          mrc.mod_remove_comment.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.ModRemoveCommunity: {
        let mrco = i.view as ModRemoveCommunityView;
        return [
          mrco.mod_remove_community.removed.unwrapOr(false)
            ? "Removed "
            : "Restored ",
          <span>
            Community <CommunityLink community={mrco.community} />
          </span>,
          mrco.mod_remove_community.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
          mrco.mod_remove_community.expires.match({
            some: expires => (
              <div>expires: {moment.utc(expires).fromNow()}</div>
            ),
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.ModBanFromCommunity: {
        let mbfc = i.view as ModBanFromCommunityView;
        return [
          <span>
            {mbfc.mod_ban_from_community.banned.unwrapOr(false)
              ? "Banned "
              : "Unbanned "}{" "}
          </span>,
          <span>
            <PersonListing person={mbfc.banned_person} />
          </span>,
          <span> from the community </span>,
          <span>
            <CommunityLink community={mbfc.community} />
          </span>,
          mbfc.mod_ban_from_community.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
          mbfc.mod_ban_from_community.expires.match({
            some: expires => (
              <div>expires: {moment.utc(expires).fromNow()}</div>
            ),
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.ModAddCommunity: {
        let mac = i.view as ModAddCommunityView;
        return [
          <span>
            {mac.mod_add_community.removed.unwrapOr(false)
              ? "Removed "
              : "Appointed "}{" "}
          </span>,
          <span>
            <PersonListing person={mac.modded_person} />
          </span>,
          <span> as a mod to the community </span>,
          <span>
            <CommunityLink community={mac.community} />
          </span>,
        ];
      }
      case ModlogEnum.ModTransferCommunity: {
        let mtc = i.view as ModTransferCommunityView;
        return [
          <span>
            {mtc.mod_transfer_community.removed.unwrapOr(false)
              ? "Removed "
              : "Transferred "}{" "}
          </span>,
          <span>
            <CommunityLink community={mtc.community} />
          </span>,
          <span> to </span>,
          <span>
            <PersonListing person={mtc.modded_person} />
          </span>,
        ];
      }
      case ModlogEnum.ModBan: {
        let mb = i.view as ModBanView;
        return [
          <span>
            {mb.mod_ban.banned.unwrapOr(false) ? "Banned " : "Unbanned "}{" "}
          </span>,
          <span>
            <PersonListing person={mb.banned_person} />
          </span>,
          mb.mod_ban.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
          mb.mod_ban.expires.match({
            some: expires => (
              <div>expires: {moment.utc(expires).fromNow()}</div>
            ),
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.ModAdd: {
        let ma = i.view as ModAddView;
        return [
          <span>
            {ma.mod_add.removed.unwrapOr(false) ? "Removed " : "Appointed "}{" "}
          </span>,
          <span>
            <PersonListing person={ma.modded_person} />
          </span>,
          <span> as an admin </span>,
        ];
      }
      case ModlogEnum.AdminPurgePerson: {
        let ap = i.view as AdminPurgePersonView;
        return [
          <span>Purged a Person</span>,
          ap.admin_purge_person.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.AdminPurgeCommunity: {
        let ap = i.view as AdminPurgeCommunityView;
        return [
          <span>Purged a Community</span>,
          ap.admin_purge_community.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.AdminPurgePost: {
        let ap = i.view as AdminPurgePostView;
        return [
          <span>Purged a Post from from </span>,
          <CommunityLink community={ap.community} />,
          ap.admin_purge_post.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
      }
      case ModlogEnum.AdminPurgeComment: {
        let ap = i.view as AdminPurgeCommentView;
        return [
          <span>
            Purged a Comment from{" "}
            <Link to={`/post/${ap.post.id}`}>{ap.post.name}</Link>
          </span>,
          ap.admin_purge_comment.reason.match({
            some: reason => <div>reason: {reason}</div>,
            none: <></>,
          }),
        ];
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
          <tr>
            <td>
              <MomentTime published={i.when_} updated={None} />
            </td>
            <td>
              {this.amAdminOrMod ? (
                <PersonListing person={i.moderator} />
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

  modOrAdminText(person: PersonSafe): string {
    if (
      this.isoData.site_res.admins.map(a => a.person.id).includes(person.id)
    ) {
      return i18n.t("admin");
    } else {
      return i18n.t("mod");
    }
  }

  get documentTitle(): string {
    return this.state.siteRes.site_view.match({
      some: siteView => `Modlog - ${siteView.site.name}`,
      none: "",
    });
  }

  render() {
    return (
      <div class="container">
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
            <div class="table-responsive">
              <table id="modlog_table" class="table table-sm table-hover">
                <thead class="pointer">
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

  handlePageChange(val: number) {
    this.setState({ page: val });
    this.refetch();
  }

  refetch() {
    let modlogForm = new GetModlog({
      community_id: this.state.communityId,
      mod_person_id: None,
      page: Some(this.state.page),
      limit: Some(fetchLimit),
      auth: auth(false).ok(),
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
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.state.res = Some(data);
      this.setState(this.state);
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg, GetCommunityResponse);
      this.state.communityMods = Some(data.moderators);
    }
  }
}
