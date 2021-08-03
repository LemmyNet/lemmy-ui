import { Component } from "inferno";
import { Link } from "inferno-router";
import {
  CommunityModeratorView,
  GetCommunity,
  GetCommunityResponse,
  GetModlog,
  GetModlogResponse,
  ModAddCommunityView,
  ModAddView,
  ModBanFromCommunityView,
  ModBanView,
  ModLockPostView,
  ModRemoveCommentView,
  ModRemoveCommunityView,
  ModRemovePostView,
  ModStickyPostView,
  SiteView,
  UserOperation,
} from "lemmy-js-client";
import moment from "moment";
import { Subscription } from "rxjs";
import { i18n } from "../i18next";
import { InitialFetchRequest } from "../interfaces";
import { UserService, WebSocketService } from "../services";
import {
  fetchLimit,
  isBrowser,
  setIsoData,
  toast,
  wsClient,
  wsJsonToRes,
  wsSubscribe,
  wsUserOp,
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
  ModAdd,
  ModBan,
}

type ModlogType = {
  id: number;
  type_: ModlogEnum;
  view:
    | ModRemovePostView
    | ModLockPostView
    | ModStickyPostView
    | ModRemoveCommentView
    | ModRemoveCommunityView
    | ModBanFromCommunityView
    | ModBanView
    | ModAddCommunityView
    | ModAddView;
  when_: string;
};

interface ModlogState {
  res: GetModlogResponse;
  communityId?: number;
  communityName?: string;
  communityMods?: CommunityModeratorView[];
  page: number;
  site_view: SiteView;
  loading: boolean;
}

export class Modlog extends Component<any, ModlogState> {
  private isoData = setIsoData(this.context);
  private subscription: Subscription;
  private emptyState: ModlogState = {
    res: {
      removed_posts: [],
      locked_posts: [],
      stickied_posts: [],
      removed_comments: [],
      removed_communities: [],
      banned_from_community: [],
      banned: [],
      added_to_community: [],
      added: [],
    },
    page: 1,
    loading: true,
    site_view: this.isoData.site_res.site_view,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handlePageChange = this.handlePageChange.bind(this);

    this.state.communityId = this.props.match.params.community_id
      ? Number(this.props.match.params.community_id)
      : undefined;

    this.parseMessage = this.parseMessage.bind(this);
    this.subscription = wsSubscribe(this.parseMessage);

    // Only fetch the data if coming from another route
    if (this.isoData.path == this.context.router.route.match.url) {
      let data = this.isoData.routeData[0];
      this.state.res = data;
      this.state.loading = false;

      // Getting the moderators
      if (this.isoData.routeData[1]) {
        this.state.communityMods = this.isoData.routeData[1].moderators;
      }
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
      when_: r.mod_remove_post.when_,
    }));

    let locked_posts: ModlogType[] = res.locked_posts.map(r => ({
      id: r.mod_lock_post.id,
      type_: ModlogEnum.ModLockPost,
      view: r,
      when_: r.mod_lock_post.when_,
    }));

    let stickied_posts: ModlogType[] = res.stickied_posts.map(r => ({
      id: r.mod_sticky_post.id,
      type_: ModlogEnum.ModStickyPost,
      view: r,
      when_: r.mod_sticky_post.when_,
    }));

    let removed_comments: ModlogType[] = res.removed_comments.map(r => ({
      id: r.mod_remove_comment.id,
      type_: ModlogEnum.ModRemoveComment,
      view: r,
      when_: r.mod_remove_comment.when_,
    }));

    let removed_communities: ModlogType[] = res.removed_communities.map(r => ({
      id: r.mod_remove_community.id,
      type_: ModlogEnum.ModRemoveCommunity,
      view: r,
      when_: r.mod_remove_community.when_,
    }));

    let banned_from_community: ModlogType[] = res.banned_from_community.map(
      r => ({
        id: r.mod_ban_from_community.id,
        type_: ModlogEnum.ModBanFromCommunity,
        view: r,
        when_: r.mod_ban_from_community.when_,
      })
    );

    let added_to_community: ModlogType[] = res.added_to_community.map(r => ({
      id: r.mod_add_community.id,
      type_: ModlogEnum.ModAddCommunity,
      view: r,
      when_: r.mod_add_community.when_,
    }));

    let added: ModlogType[] = res.added.map(r => ({
      id: r.mod_add.id,
      type_: ModlogEnum.ModAdd,
      view: r,
      when_: r.mod_add.when_,
    }));

    let banned: ModlogType[] = res.banned.map(r => ({
      id: r.mod_ban.id,
      type_: ModlogEnum.ModBan,
      view: r,
      when_: r.mod_ban.when_,
    }));

    let combined: ModlogType[] = [];

    combined.push(...removed_posts);
    combined.push(...locked_posts);
    combined.push(...stickied_posts);
    combined.push(...removed_comments);
    combined.push(...removed_communities);
    combined.push(...banned_from_community);
    combined.push(...added_to_community);
    combined.push(...added);
    combined.push(...banned);

    if (this.state.communityId && combined.length > 0) {
      this.state.communityName = (
        combined[0].view as ModRemovePostView
      ).community.name;
    }

    // Sort them by time
    combined.sort((a, b) => b.when_.localeCompare(a.when_));

    return combined;
  }

  renderModlogType(i: ModlogType) {
    switch (i.type_) {
      case ModlogEnum.ModRemovePost: {
        let mrpv = i.view as ModRemovePostView;
        return [
          mrpv.mod_remove_post.removed ? "Removed " : "Restored ",
          <span>
            Post <Link to={`/post/${mrpv.post.id}`}>{mrpv.post.name}</Link>
          </span>,
          mrpv.mod_remove_post.reason &&
            ` reason: ${mrpv.mod_remove_post.reason}`,
        ];
      }
      case ModlogEnum.ModLockPost: {
        let mlpv = i.view as ModLockPostView;
        return [
          mlpv.mod_lock_post.locked ? "Locked " : "Unlocked ",
          <span>
            Post <Link to={`/post/${mlpv.post.id}`}>{mlpv.post.name}</Link>
          </span>,
        ];
      }
      case ModlogEnum.ModStickyPost: {
        let mspv = i.view as ModStickyPostView;
        return [
          mspv.mod_sticky_post.stickied ? "Stickied " : "Unstickied ",
          <span>
            Post <Link to={`/post/${mspv.post.id}`}>{mspv.post.name}</Link>
          </span>,
        ];
      }
      case ModlogEnum.ModRemoveComment: {
        let mrc = i.view as ModRemoveCommentView;
        return [
          mrc.mod_remove_comment.removed ? "Removed " : "Restored ",
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
          mrc.mod_remove_comment.reason &&
            ` reason: ${mrc.mod_remove_comment.reason}`,
        ];
      }
      case ModlogEnum.ModRemoveCommunity: {
        let mrco = i.view as ModRemoveCommunityView;
        return [
          mrco.mod_remove_community.removed ? "Removed " : "Restored ",
          <span>
            Community <CommunityLink community={mrco.community} />
          </span>,
          mrco.mod_remove_community.reason &&
            ` reason: ${mrco.mod_remove_community.reason}`,
          mrco.mod_remove_community.expires &&
            ` expires: ${moment
              .utc(mrco.mod_remove_community.expires)
              .fromNow()}`,
        ];
      }
      case ModlogEnum.ModBanFromCommunity: {
        let mbfc = i.view as ModBanFromCommunityView;
        return [
          <span>
            {mbfc.mod_ban_from_community.banned ? "Banned " : "Unbanned "}{" "}
          </span>,
          <span>
            <PersonListing person={mbfc.banned_person} />
          </span>,
          <span> from the community </span>,
          <span>
            <CommunityLink community={mbfc.community} />
          </span>,
          <div>
            {mbfc.mod_ban_from_community.reason &&
              ` reason: ${mbfc.mod_ban_from_community.reason}`}
          </div>,
          <div>
            {mbfc.mod_ban_from_community.expires &&
              ` expires: ${moment
                .utc(mbfc.mod_ban_from_community.expires)
                .fromNow()}`}
          </div>,
        ];
      }
      case ModlogEnum.ModAddCommunity: {
        let mac = i.view as ModAddCommunityView;
        return [
          <span>
            {mac.mod_add_community.removed ? "Removed " : "Appointed "}{" "}
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
      case ModlogEnum.ModBan: {
        let mb = i.view as ModBanView;
        return [
          <span>{mb.mod_ban.banned ? "Banned " : "Unbanned "} </span>,
          <span>
            <PersonListing person={mb.banned_person} />
          </span>,
          <div>{mb.mod_ban.reason && ` reason: ${mb.mod_ban.reason}`}</div>,
          <div>
            {mb.mod_ban.expires &&
              ` expires: ${moment.utc(mb.mod_ban.expires).fromNow()}`}
          </div>,
        ];
      }
      case ModlogEnum.ModAdd: {
        let ma = i.view as ModAddView;
        return [
          <span>{ma.mod_add.removed ? "Removed " : "Appointed "} </span>,
          <span>
            <PersonListing person={ma.modded_person} />
          </span>,
          <span> as an admin </span>,
        ];
      }
      default:
        return <div />;
    }
  }

  combined() {
    let combined = this.buildCombined(this.state.res);

    return (
      <tbody>
        {combined.map(i => (
          <tr>
            <td>
              <MomentTime data={i} />
            </td>
            <td>
              {this.isAdminOrMod ? (
                <PersonListing person={i.view.moderator} />
              ) : (
                <div>{i18n.t("mod")}</div>
              )}
            </td>
            <td>{this.renderModlogType(i)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  get isAdminOrMod(): boolean {
    let isAdmin =
      UserService.Instance.localUserView &&
      this.isoData.site_res.admins
        .map(a => a.person.id)
        .includes(UserService.Instance.localUserView.person.id);
    let isMod =
      UserService.Instance.localUserView &&
      this.state.communityMods &&
      this.state.communityMods
        .map(m => m.moderator.id)
        .includes(UserService.Instance.localUserView.person.id);
    return isAdmin || isMod;
  }

  get documentTitle(): string {
    return `Modlog - ${this.state.site_view.site.name}`;
  }

  render() {
    return (
      <div class="container">
        <HtmlTags
          title={this.documentTitle}
          path={this.context.router.route.match.url}
        />
        {this.state.loading ? (
          <h5>
            <Spinner large />
          </h5>
        ) : (
          <div>
            <h5>
              {this.state.communityName && (
                <Link
                  className="text-body"
                  to={`/c/${this.state.communityName}`}
                >
                  /c/{this.state.communityName}{" "}
                </Link>
              )}
              <span>{i18n.t("modlog")}</span>
            </h5>
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
    let modlogForm: GetModlog = {
      community_id: this.state.communityId,
      page: this.state.page,
      limit: fetchLimit,
    };
    WebSocketService.Instance.send(wsClient.getModlog(modlogForm));

    if (this.state.communityId) {
      let communityForm: GetCommunity = {
        id: this.state.communityId,
        name: this.state.communityName,
      };
      WebSocketService.Instance.send(wsClient.getCommunity(communityForm));
    }
  }

  static fetchInitialData(req: InitialFetchRequest): Promise<any>[] {
    let pathSplit = req.path.split("/");
    let communityId = pathSplit[3];
    let promises: Promise<any>[] = [];

    let modlogForm: GetModlog = {
      page: 1,
      limit: fetchLimit,
    };

    if (communityId) {
      modlogForm.community_id = Number(communityId);
    }

    promises.push(req.client.getModlog(modlogForm));

    if (communityId) {
      let communityForm: GetCommunity = {
        id: Number(communityId),
      };
      promises.push(req.client.getCommunity(communityForm));
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
      let data = wsJsonToRes<GetModlogResponse>(msg).data;
      this.state.loading = false;
      window.scrollTo(0, 0);
      this.state.res = data;
      this.setState(this.state);
    } else if (op == UserOperation.GetCommunity) {
      let data = wsJsonToRes<GetCommunityResponse>(msg).data;
      this.state.communityMods = data.moderators;
    }
  }
}
