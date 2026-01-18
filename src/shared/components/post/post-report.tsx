import { Component, InfernoNode } from "inferno";
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
  enableNsfw: boolean;
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
          postView={pv}
          showCrossPosts="show_separately"
          showCommunity
          enableNsfw={this.props.enableNsfw}
          crossPosts={[]}
          showAdultConsentModal={this.props.showAdultConsentModal}
          viewOnly
          allLanguages={[]}
          siteLanguages={[]}
          hideImage
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          admins={this.props.admins}
          postListingMode="small_card"
          showBody={"full"}
          markable={false}
          disableAutoMarkAsRead={false}
          editLoading={false}
          // All of these are unused, since its view only
          onPostEdit={() => EMPTY_REQUEST}
          onPostVote={() => EMPTY_REQUEST}
          onPostReport={() => {}}
          onBlockPerson={() => {}}
          onBlockCommunity={() => {}}
          onLockPost={() => {}}
          onDeletePost={() => {}}
          onRemovePost={() => {}}
          onSavePost={() => {}}
          onFeaturePost={() => {}}
          onPurgePerson={() => {}}
          onPurgePost={() => {}}
          onBanPersonFromCommunity={() => {}}
          onBanPerson={() => {}}
          onAddModToCommunity={() => {}}
          onAddAdmin={() => {}}
          onTransferCommunity={() => {}}
          onMarkPostAsRead={() => {}}
          onHidePost={() => {}}
          onPersonNote={() => {}}
          onScrollIntoCommentsClick={() => {}}
        />
        <div>
          {I18NextService.i18n.t("reporter")}:{" "}
          <PersonListing
            person={r.creator}
            banned={false}
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
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            )}
          </div>
        )}
        <button
          className="btn btn-link btn-animate text-muted py-0"
          onClick={() => handleResolveReport(this)}
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
          onClick={() => handleModBanFromCommunity(this)}
          iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
        />
        {this.props.myUserInfo?.local_user_view.local_user.admin && (
          <ActionButton
            label={I18NextService.i18n.t(pv.creator_banned ? "unban" : "ban")}
            inline
            icon={pv.creator_banned ? "unban" : "ban"}
            noLoading
            onClick={() => handleAdminBan(this)}
            iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
          />
        )}
        {this.state.showRemovePostDialog && (
          <ModActionFormModal
            onSubmit={reason => handleRemovePost(this, reason)}
            modActionType="remove-post"
            isRemoved={pv.post.removed}
            onCancel={() => this.setState({ showRemovePostDialog: false })}
            show
          />
        )}
      </div>
    );
  }
}

function handleResolveReport(i: PostReport) {
  i.setState({ loading: true });
  i.props.onResolveReport({
    report_id: i.props.report.post_report.id,
    resolved: !i.props.report.post_report.resolved,
  });
}

async function handleRemovePost(i: PostReport, reason: string) {
  i.props.onRemovePost({
    post_id: i.props.report.post.id,
    removed: !i.props.report.post.removed,
    reason,
  });
  i.setState({ showRemovePostDialog: false });
}

function handleModBanFromCommunity(i: PostReport) {
  i.setState({ loading: true });
  i.props.onModBanFromCommunity({
    person: i.props.report.post_creator,
    community: i.props.report.community,
    ban: !i.props.report.creator_banned_from_community,
  });
}

function handleAdminBan(i: PostReport) {
  i.setState({ loading: true });
  i.props.onAdminBan({
    person: i.props.report.post_creator,
    ban: !i.props.report.creator_banned,
  });
}
