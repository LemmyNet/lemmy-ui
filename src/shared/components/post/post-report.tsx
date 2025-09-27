import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  LocalSite,
  MyUserInfo,
  PersonView,
  PostReportView,
  PostView,
  RemovePost,
  ResolvePostReport,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { PostListing } from "./post-listing";
import { EMPTY_REQUEST } from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";
import ActionButton from "@components/common/content-actions/action-button";
import {
  BanFromCommunityData,
  BanFromSiteData,
} from "@components/person/reports";
import ModActionFormModal from "@components/common/modal/mod-action-form-modal";

interface PostReportProps {
  report: PostReportView;
  enableNsfw?: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  onResolveReport(form: ResolvePostReport): void;
  onRemovePost(form: RemovePost): void;
  onModBanFromCommunity(form: BanFromCommunityData): void;
  onAdminBan(form: BanFromSiteData): void;
}

interface PostReportState {
  loading: boolean;
  showRemovePostDialog: boolean;
}

@tippyMixin
export class PostReport extends Component<PostReportProps, PostReportState> {
  state: PostReportState = {
    loading: false,
    showRemovePostDialog: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleRemovePost = this.handleRemovePost.bind(this);
    this.handleModBanFromCommunity = this.handleModBanFromCommunity.bind(this);
    this.handleAdminBan = this.handleAdminBan.bind(this);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & PostReportProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const r = this.props.report;
    const resolver = r.resolver;
    const post = r.post;
    const tippyContent = I18NextService.i18n.t(
      r.post_report.resolved ? "unresolve_report" : "resolve_report",
    );

    // Set the original post data ( a troll could change it )
    post.name = r.post_report.original_post_name;
    post.url = r.post_report.original_post_url;
    post.body = r.post_report.original_post_body;

    const pv: PostView = {
      post,
      creator: r.post_creator,
      community: r.community,
      image_details: undefined, // TODO: ?
      community_actions: r.community_actions,
      person_actions: r.person_actions,
      post_actions: r.post_actions,
      creator_is_admin: r.creator_is_admin,
      creator_is_moderator: r.creator_is_moderator,
      can_mod: true, // TODO: ?
      creator_banned: r.creator_banned,
      creator_banned_from_community: r.creator_banned_from_community,
      tags: [],
    };

    return (
      <div className="post-report">
        <PostListing
          post_view={pv}
          showDupes="ShowSeparately"
          showCommunity={true}
          enableNsfw={this.props.enableNsfw}
          showAdultConsentModal={this.props.showAdultConsentModal}
          viewOnly={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImage
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          admins={this.props.admins}
          // All of these are unused, since its view only
          onPostEdit={async () => EMPTY_REQUEST}
          onPostVote={async () => EMPTY_REQUEST}
          onPostReport={async () => {}}
          onBlockPerson={async () => {}}
          onLockPost={async () => {}}
          onDeletePost={async () => {}}
          onRemovePost={async () => {}}
          onSavePost={async () => {}}
          onFeaturePost={async () => {}}
          onPurgePerson={async () => {}}
          onPurgePost={async () => {}}
          onBanPersonFromCommunity={async () => {}}
          onBanPerson={async () => {}}
          onAddModToCommunity={async () => {}}
          onAddAdmin={async () => {}}
          onTransferCommunity={async () => {}}
          onMarkPostAsRead={async () => {}}
          onHidePost={async () => {}}
          onPersonNote={async () => {}}
        />
        <div>
          {I18NextService.i18n.t("reporter")}:{" "}
          <PersonListing
            person={r.creator}
            myUserInfo={this.props.myUserInfo}
          />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {r.post_report.reason}
        </div>
        {resolver && (
          <div>
            {r.post_report.resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing
                  person={resolver}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={resolver}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            )}
          </div>
        )}
        <button
          className="btn btn-link btn-animate text-muted py-0"
          onClick={linkEvent(this, this.handleResolveReport)}
          data-tippy-content={tippyContent}
          aria-label={tippyContent}
        >
          {this.state.loading ? (
            <Spinner />
          ) : (
            <Icon
              icon="check"
              classes={`icon-inline ${
                r.post_report.resolved ? "text-success" : "text-danger"
              }`}
            />
          )}
        </button>
        <ActionButton
          label={I18NextService.i18n.t(
            pv.post.removed ? "restore_post" : "remove_post",
          )}
          icon={pv.post.removed ? "restore" : "x"}
          noLoading
          onClick={() => this.setState({ showRemovePostDialog: true })}
          iconClass={`text-${pv.post.removed ? "success" : "danger"}`}
        />
        <ActionButton
          label={I18NextService.i18n.t(
            pv.creator_banned ? "unban_from_community" : "ban_from_community",
          )}
          icon={pv.creator_banned ? "unban_from_site" : "ban_from_site"}
          noLoading
          onClick={this.handleModBanFromCommunity}
          iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
        />
        {this.props.myUserInfo?.local_user_view.local_user.admin && (
          <ActionButton
            label={I18NextService.i18n.t(pv.creator_banned ? "unban" : "ban")}
            inline
            icon={pv.creator_banned ? "unban" : "ban"}
            noLoading
            onClick={this.handleAdminBan}
            iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
          />
        )}
        {this.state.showRemovePostDialog && (
          <ModActionFormModal
            onSubmit={this.handleRemovePost}
            modActionType="remove-post"
            isRemoved={pv.post.removed}
            onCancel={() => this.setState({ showRemovePostDialog: false })}
            show={true}
          />
        )}
      </div>
    );
  }

  handleResolveReport(i: PostReport) {
    i.setState({ loading: true });
    i.props.onResolveReport({
      report_id: i.props.report.post_report.id,
      resolved: !i.props.report.post_report.resolved,
    });
  }

  async handleRemovePost(reason: string) {
    this.props.onRemovePost({
      post_id: this.props.report.post.id,
      removed: !this.props.report.post.removed,
      reason,
    });
    this.setState({ showRemovePostDialog: false });
  }

  handleModBanFromCommunity() {
    this.setState({ loading: true });
    this.props.onModBanFromCommunity({
      person: this.props.report.post_creator,
      community: this.props.report.community,
      ban: !this.props.report.creator_banned_from_community,
    });
  }

  handleAdminBan() {
    this.setState({ loading: true });
    this.props.onAdminBan({
      person: this.props.report.post_creator,
      ban: !this.props.report.creator_banned,
    });
  }
}
