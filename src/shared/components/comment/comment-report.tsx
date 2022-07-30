import { None } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  CommentNode as CommentNodeI,
  CommentReportView,
  CommentView,
  ResolveCommentReport,
  SubscribedType,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { CommentViewType } from "../../interfaces";
import { WebSocketService } from "../../services";
import { auth, wsClient } from "../../utils";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { CommentNode } from "./comment-node";

interface CommentReportProps {
  report: CommentReportView;
}

export class CommentReport extends Component<CommentReportProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let r = this.props.report;
    let comment = r.comment;
    let tippyContent = i18n.t(
      r.comment_report.resolved ? "unresolve_report" : "resolve_report"
    );

    // Set the original post data ( a troll could change it )
    comment.content = r.comment_report.original_comment_text;

    let comment_view: CommentView = {
      comment,
      creator: r.comment_creator,
      post: r.post,
      community: r.community,
      creator_banned_from_community: r.creator_banned_from_community,
      counts: r.counts,
      subscribed: SubscribedType.NotSubscribed,
      saved: false,
      creator_blocked: false,
      my_vote: r.my_vote,
    };

    let node: CommentNodeI = {
      comment_view,
      children: [],
      depth: 0,
    };

    return (
      <div>
        <CommentNode
          node={node}
          viewType={CommentViewType.Flat}
          moderators={None}
          admins={None}
          enableDownvotes={true}
          viewOnly={true}
          showCommunity={true}
        />
        <div>
          {i18n.t("reporter")}: <PersonListing person={r.creator} />
        </div>
        <div>
          {i18n.t("reason")}: {r.comment_report.reason}
        </div>
        {r.resolver.match({
          some: resolver => (
            <div>
              {r.comment_report.resolved ? (
                <T i18nKey="resolved_by">
                  #
                  <PersonListing person={resolver} />
                </T>
              ) : (
                <T i18nKey="unresolved_by">
                  #
                  <PersonListing person={resolver} />
                </T>
              )}
            </div>
          ),
          none: <></>,
        })}
        <button
          className="btn btn-link btn-animate text-muted py-0"
          onClick={linkEvent(this, this.handleResolveReport)}
          data-tippy-content={tippyContent}
          aria-label={tippyContent}
        >
          <Icon
            icon="check"
            classes={`icon-inline ${
              r.comment_report.resolved ? "text-success" : "text-danger"
            }`}
          />
        </button>
      </div>
    );
  }

  handleResolveReport(i: CommentReport) {
    let form = new ResolveCommentReport({
      report_id: i.props.report.comment_report.id,
      resolved: !i.props.report.comment_report.resolved,
      auth: auth().unwrap(),
    });
    WebSocketService.Instance.send(wsClient.resolveCommentReport(form));
  }
}
