import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CommentReportView,
  CommentView,
  LocalSite,
  MyUserInfo,
  PersonView,
  RemoveComment,
  ResolveCommentReport,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { CommentNode } from "./comment-node";
import { tippyMixin } from "../mixins/tippy-mixin";
import ActionButton from "@components/common/content-actions/action-button";
import {
  BanFromCommunityData,
  BanFromSiteData,
} from "@components/person/reports";
import ModActionFormModal from "@components/common/modal/mod-action-form-modal";
import { commentToFlatNode } from "@utils/app";

interface CommentReportProps {
  report: CommentReportView;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  loading: boolean;
  onResolveReport(form: ResolveCommentReport): void;
  onRemoveComment(form: RemoveComment): void;
  onModBanFromCommunity(form: BanFromCommunityData): void;
  onAdminBan(form: BanFromSiteData): void;
}

interface CommentReportState {
  showRemoveCommentDialog: boolean;
}

@tippyMixin
export class CommentReport extends Component<
  CommentReportProps,
  CommentReportState
> {
  state: CommentReportState = {
    showRemoveCommentDialog: false,
  };

  render() {
    const r = this.props.report;
    const comment = r.comment;
    const tippyContent = I18NextService.i18n.t(
      r.comment_report.resolved ? "unresolve_report" : "resolve_report",
    );

    // Set the original post data ( a troll could change it )
    comment.content = r.comment_report.original_comment_text;

    const comment_view: CommentView = {
      comment,
      creator: r.comment_creator,
      post: r.post,
      community: r.community,
      community_actions: r.community_actions,
      comment_actions: r.comment_actions,
      person_actions: r.person_actions,
      creator_is_admin: r.creator_is_admin,
      creator_is_moderator: r.creator_is_moderator,
      can_mod: true, // TODO: ?
      creator_banned: r.creator_banned,
      creator_banned_from_community: r.creator_banned_from_community,
      tags: [],
    };

    return (
      <div className="comment-report">
        <CommentNode
          node={commentToFlatNode(comment_view)}
          admins={this.props.admins}
          viewType={"flat"}
          createLoading={undefined}
          editLoading={undefined}
          markReadLoading={undefined}
          fetchChildrenLoading={undefined}
          voteLoading={undefined}
          viewOnly
          showCommunity
          showContext={false}
          allLanguages={[]}
          siteLanguages={[]}
          hideImages
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          showMarkRead={"hide"}
          // All of these are unused, since its viewonly
          onSaveComment={() => {}}
          onBlockPerson={() => {}}
          onBlockCommunity={() => {}}
          onDeleteComment={() => {}}
          onRemoveComment={() => {}}
          onCommentVote={() => {}}
          onCommentReport={() => {}}
          onDistinguishComment={() => {}}
          onAddModToCommunity={() => {}}
          onAddAdmin={() => {}}
          onTransferCommunity={() => {}}
          onPurgeComment={() => {}}
          onPurgePerson={() => {}}
          onBanPersonFromCommunity={() => {}}
          onBanPerson={() => {}}
          onCreateComment={() => {}}
          onEditComment={() => {}}
          onPersonNote={() => {}}
          onLockComment={() => {}}
          onMarkRead={() => {}}
          onFetchChildren={() => {}}
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
          {I18NextService.i18n.t("reason")}: {r.comment_report.reason}
        </div>
        {r.resolver && (
          <div>
            {r.comment_report.resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing
                  person={r.resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={r.resolver}
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
          {this.props.loading ? (
            <Spinner />
          ) : (
            <Icon
              icon="check"
              classes={`icon-inline ${
                r.comment_report.resolved ? "text-success" : "text-danger"
              }`}
            />
          )}
        </button>
        <ActionButton
          label={I18NextService.i18n.t(
            comment_view.comment.removed ? "restore_comment" : "remove_comment",
          )}
          inline
          icon={comment_view.comment.removed ? "restore" : "x"}
          noLoading
          onClick={() => this.setState({ showRemoveCommentDialog: true })}
          iconClass={`text-${comment_view.comment.removed ? "success" : "danger"}`}
        />
        <ActionButton
          label={I18NextService.i18n.t(
            comment_view.creator_banned
              ? "unban_from_community"
              : "ban_from_community",
          )}
          inlineWithText
          icon={comment_view.creator_banned ? "unban" : "ban"}
          noLoading
          onClick={() => handleModBanFromCommunity(this)}
          iconClass={`text-${comment_view.creator_banned ? "success" : "danger"}`}
        />
        {this.props.myUserInfo?.local_user_view.local_user.admin && (
          <ActionButton
            label={I18NextService.i18n.t(
              comment_view.creator_banned ? "unban_from_site" : "ban_from_site",
            )}
            inlineWithText
            icon={comment_view.creator_banned ? "unban" : "ban"}
            noLoading
            onClick={() => handleAdminBan(this)}
            iconClass={`text-${comment_view.creator_banned ? "success" : "danger"}`}
          />
        )}
        {this.state.showRemoveCommentDialog && (
          <ModActionFormModal
            onSubmit={reason => handleRemoveComment(this, reason)}
            modActionType="remove-comment"
            isRemoved={comment_view.comment.removed}
            onCancel={() => this.setState({ showRemoveCommentDialog: false })}
            show
            loading={false}
          />
        )}
      </div>
    );
  }
}

function handleResolveReport(i: CommentReport) {
  i.props.onResolveReport({
    report_id: i.props.report.comment_report.id,
    resolved: !i.props.report.comment_report.resolved,
  });
}

function handleRemoveComment(i: CommentReport, reason: string) {
  i.props.onRemoveComment({
    comment_id: i.props.report.comment.id,
    removed: !i.props.report.comment.removed,
    reason,
  });
  i.setState({ showRemoveCommentDialog: false });
}

function handleModBanFromCommunity(i: CommentReport) {
  i.props.onModBanFromCommunity({
    person: i.props.report.comment_creator,
    community: i.props.report.community,
    ban: !i.props.report.creator_banned,
  });
}

function handleAdminBan(i: CommentReport) {
  i.props.onAdminBan({
    person: i.props.report.comment_creator,
    ban: !i.props.report.creator_banned,
  });
}
