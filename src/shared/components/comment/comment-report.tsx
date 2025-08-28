import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CommentReportView,
  CommentView,
  LocalSite,
  MyUserInfo,
  PersonView,
  ResolveCommentReport,
} from "lemmy-js-client";
import { CommentNodeI, CommentViewType } from "@utils/types";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { CommentNode } from "./comment-node";
import { EMPTY_REQUEST } from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";

interface CommentReportProps {
  report: CommentReportView;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  onResolveReport(form: ResolveCommentReport): void;
}

interface CommentReportState {
  loading: boolean;
}

@tippyMixin
export class CommentReport extends Component<
  CommentReportProps,
  CommentReportState
> {
  state: CommentReportState = {
    loading: false,
  };
  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & CommentReportProps>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false });
    }
  }

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
      post_tags: [],
    };

    const node: CommentNodeI = {
      comment_view,
      children: [],
      depth: 0,
    };

    return (
      <div className="comment-report">
        <CommentNode
          node={node}
          admins={this.props.admins}
          viewType={CommentViewType.Flat}
          viewOnly={true}
          showCommunity={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImages
          myUserInfo={this.props.myUserInfo}
          localSite={this.props.localSite}
          // All of these are unused, since its viewonly
          onSaveComment={async () => {}}
          onBlockPerson={async () => {}}
          onDeleteComment={async () => {}}
          onRemoveComment={async () => {}}
          onCommentVote={async () => {}}
          onCommentReport={async () => {}}
          onDistinguishComment={async () => {}}
          onAddModToCommunity={async () => {}}
          onAddAdmin={async () => {}}
          onTransferCommunity={async () => {}}
          onPurgeComment={async () => {}}
          onPurgePerson={async () => {}}
          onBanPersonFromCommunity={async () => {}}
          onBanPerson={async () => {}}
          onCreateComment={async () => Promise.resolve(EMPTY_REQUEST)}
          onEditComment={() => Promise.resolve(EMPTY_REQUEST)}
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
          {I18NextService.i18n.t("reason")}: {r.comment_report.reason}
        </div>
        {r.resolver && (
          <div>
            {r.comment_report.resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing
                  person={r.resolver}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={r.resolver}
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
                r.comment_report.resolved ? "text-success" : "text-danger"
              }`}
            />
          )}
        </button>
      </div>
    );
  }

  handleResolveReport(i: CommentReport) {
    i.setState({ loading: true });
    i.props.onResolveReport({
      report_id: i.props.report.comment_report.id,
      resolved: !i.props.report.comment_report.resolved,
    });
  }
}
