import { Component } from "inferno";
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
import { PersonListing } from "../person/person-listing";
import { PostListing } from "./post-listing";
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
  loading: boolean;
  onResolveReport: (form: ResolvePostReport) => void;
  onRemovePost: (form: RemovePost) => void;
  onModBanFromCommunity: (form: BanFromCommunityData) => void;
  onAdminBan: (form: BanFromSiteData) => void;
}

interface PostReportState {
  showRemovePostDialog: boolean;
  showResolveReportDialog: boolean;
  resolveReason: string;
}

@tippyMixin
export class PostReport extends Component<PostReportProps, PostReportState> {
  state: PostReportState = {
    showRemovePostDialog: false,
    showResolveReportDialog: false,
    resolveReason: "",
  };

  handleResolveReasonChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.setState({ resolveReason: target.value });
  };

  handleResolveSubmit = () => {
    const resolved = this.props.report.post_report.resolved;
    const reason = resolved
      ? "Unresolved by moderator"
      : this.state.resolveReason || "Resolved by moderator";

    this.props.onResolveReport({
      report_id: this.props.report.post_report.id,
      resolved: !resolved,
      resolve_reason: reason,
    });
    this.setState({ showResolveReportDialog: false, resolveReason: "" });
  };

  handleResolveCancel = () => {
    this.setState({ showResolveReportDialog: false, resolveReason: "" });
  };

  render() {
    const r = this.props.report;
    const resolver = r.resolver;
    const post = r.post;
    const resolved = r.post_report.resolved;

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
          communityTags={[]}
          hideImage
          topBorder={false}
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          admins={this.props.admins}
          postListingMode="small_card"
          showBody={"full"}
          showMarkRead="hide"
          disableAutoMarkAsRead={false}
          editLoading={false}
          markReadLoading={false}
          voteLoading={false}
          mutePersonName={false}
          muteCommunityName={false}
          hideAvatar={false}
          // All of these are unused, since its view only
          onPostEdit={() => {}}
          onPostModEdit={() => {}}
          onPostVote={() => {}}
          onPostReport={() => {}}
          onBlockPerson={() => {}}
          onBlockCommunity={() => {}}
          onLockPost={() => {}}
          onWarnPost={() => {}}
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
        <div className="mt-2">
          {I18NextService.i18n.t("reporter")}:{" "}
          <PersonListing
            person={r.creator}
            banned={false}
            myUserInfo={this.props.myUserInfo}
            muted={false}
          />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {r.post_report.reason}
        </div>
        {resolver && (
          <div>
            {resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing
                  person={resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                  muted={false}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                  muted={false}
                />
              </T>
            )}
          </div>
        )}
        <div className="row row-cols-auto align-items-center gx-3 my-2">
          <div className="col">
            <ActionButton
              label={I18NextService.i18n.t(
                resolved ? "unresolve_report" : "resolve_report",
              )}
              icon={resolved ? "check" : "x"}
              loading={this.props.loading}
              inlineWithText
              onClick={() => this.setState({ showResolveReportDialog: true })}
              iconClass={`text-${resolved ? "success" : "danger"}`}
            />
          </div>
          <div className="col">
            <ActionButton
              label={I18NextService.i18n.t(
                pv.post.removed ? "restore_post" : "remove_post",
              )}
              icon={pv.post.removed ? "restore" : "x"}
              noLoading
              inlineWithText
              onClick={() => this.setState({ showRemovePostDialog: true })}
              iconClass={`text-${pv.post.removed ? "success" : "danger"}`}
            />
          </div>
          <div className="col">
            <ActionButton
              label={I18NextService.i18n.t(
                pv.creator_banned
                  ? "unban_from_community"
                  : "ban_from_community",
              )}
              icon={pv.creator_banned ? "unban" : "ban"}
              noLoading
              inlineWithText
              onClick={() => handleModBanFromCommunity(this)}
              iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
            />
          </div>
          {this.props.myUserInfo?.local_user_view.local_user.admin && (
            <div className="col">
              <ActionButton
                label={I18NextService.i18n.t(
                  pv.creator_banned ? "unban" : "ban",
                )}
                inline
                icon={pv.creator_banned ? "unban" : "ban"}
                noLoading
                inlineWithText
                onClick={() => handleAdminBan(this)}
                iconClass={`text-${pv.creator_banned ? "success" : "danger"}`}
              />
            </div>
          )}
        </div>
        {this.state.showRemovePostDialog && (
          <ModActionFormModal
            onSubmit={reason => handleRemovePost(this, reason)}
            modActionType="remove-post"
            isRemoved={pv.post.removed}
            onCancel={() => this.setState({ showRemovePostDialog: false })}
            show
            loading={false}
          />
        )}
        {this.state.showResolveReportDialog && (
          <div
            className="modal show d-block"
            style={{ "background-color": "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {I18NextService.i18n.t(
                      resolved ? "unresolve_report" : "resolve_report",
                    )}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={this.handleResolveCancel}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  {!resolved && (
                    <div className="mb-3">
                      <label htmlFor="resolveReason" className="form-label">
                        {I18NextService.i18n.t("resolve_reason_optional")}
                      </label>
                      <textarea
                        id="resolveReason"
                        className="form-control"
                        rows={3}
                        value={this.state.resolveReason}
                        onInput={this.handleResolveReasonChange}
                        placeholder={I18NextService.i18n.t(
                          "enter_resolve_reason_optional",
                        )}
                      />
                    </div>
                  )}
                  {resolved && (
                    <p>
                      {I18NextService.i18n.t("unresolve_report_confirmation")}
                    </p>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={this.handleResolveCancel}
                  >
                    {I18NextService.i18n.t("cancel")}
                  </button>
                  <button
                    type="button"
                    className={`btn ${resolved ? "btn-warning" : "btn-primary"}`}
                    onClick={this.handleResolveSubmit}
                    disabled={this.props.loading}
                  >
                    {this.props.loading ? (
                      <span className="spinner-border spinner-border-sm me-1" />
                    ) : null}
                    {I18NextService.i18n.t(
                      resolved ? "unresolve_report" : "resolve_report",
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

function handleRemovePost(i: PostReport, reason: string) {
  i.props.onRemovePost({
    post_id: i.props.report.post.id,
    removed: !i.props.report.post.removed,
    reason,
  });
  i.setState({ showRemovePostDialog: false });
}

function handleModBanFromCommunity(i: PostReport) {
  i.props.onModBanFromCommunity({
    person: i.props.report.post_creator,
    community: i.props.report.community,
    ban: !i.props.report.creator_banned_from_community,
  });
}

function handleAdminBan(i: PostReport) {
  i.props.onAdminBan({
    person: i.props.report.post_creator,
    ban: !i.props.report.creator_banned,
  });
}
