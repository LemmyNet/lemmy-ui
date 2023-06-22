import { myAuthRequired } from "@utils/app";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CommentReportView,
  CommentView,
  ResolveCommentReport,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { CommentNodeI, CommentViewType } from "../../interfaces";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { CommentNode } from "./comment-node";

interface CommentReportProps {
  report: CommentReportView;
  onResolveReport(form: ResolveCommentReport): void;
}

interface CommentReportState {
  loading: boolean;
}

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
    nextProps: Readonly<{ children?: InfernoNode } & CommentReportProps>
  ): void {
    if (this.props != nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const r = this.props.report;
    const comment = r.comment;
    const tippyContent = i18n.t(
      r.comment_report.resolved ? "unresolve_report" : "resolve_report"
    );

    // Set the original post data ( a troll could change it )
    comment.content = r.comment_report.original_comment_text;

    const comment_view: CommentView = {
      comment,
      creator: r.comment_creator,
      post: r.post,
      community: r.community,
      creator_banned_from_community: r.creator_banned_from_community,
      counts: r.counts,
      subscribed: "NotSubscribed",
      saved: false,
      creator_blocked: false,
      my_vote: r.my_vote,
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
          viewType={CommentViewType.Flat}
          enableDownvotes={true}
          viewOnly={true}
          showCommunity={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImages
          // All of these are unused, since its viewonly
          finished={new Map()}
          onSaveComment={() => {}}
          onBlockPerson={() => {}}
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
          onCommentReplyRead={() => {}}
          onPersonMentionRead={() => {}}
          onBanPersonFromCommunity={() => {}}
          onBanPerson={() => {}}
          onCreateComment={() => Promise.resolve({ state: "empty" })}
          onEditComment={() => Promise.resolve({ state: "empty" })}
        />
        <div>
          {i18n.t("reporter")}: <PersonListing person={r.creator} />
        </div>
        <div>
          {i18n.t("reason")}: {r.comment_report.reason}
        </div>
        {r.resolver && (
          <div>
            {r.comment_report.resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing person={r.resolver} />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing person={r.resolver} />
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
      auth: myAuthRequired(),
    });
  }
}
