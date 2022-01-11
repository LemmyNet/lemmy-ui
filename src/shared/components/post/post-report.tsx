import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { PostReportView, PostView, ResolvePostReport } from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import { authField, wsClient } from "../../utils";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { PostListing } from "./post-listing";

interface PostReportProps {
  report: PostReportView;
}

export class PostReport extends Component<PostReportProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let r = this.props.report;
    let post = r.post;
    let tippyContent = i18n.t(
      r.post_report.resolved ? "unresolve_report" : "resolve_report"
    );

    // Set the original post data ( a troll could change it )
    post.name = r.post_report.original_post_name;
    post.url = r.post_report.original_post_url;
    post.body = r.post_report.original_post_body;
    let pv: PostView = {
      post,
      creator: r.post_creator,
      community: r.community,
      creator_banned_from_community: r.creator_banned_from_community,
      counts: r.counts,
      subscribed: false,
      saved: false,
      read: false,
      creator_blocked: false,
      my_vote: r.my_vote,
    };

    return (
      <div>
        <PostListing
          post_view={pv}
          showCommunity={true}
          enableDownvotes={true}
          enableNsfw={true}
        />
        <div>
          {i18n.t("reporter")}: <PersonListing person={r.creator} />
        </div>
        <div>
          {i18n.t("reason")}: {r.post_report.reason}
        </div>
        {r.resolver && (
          <div>
            {r.post_report.resolved ? (
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
          <Icon
            icon="check"
            classes={`icon-inline ${
              r.post_report.resolved ? "text-success" : "text-danger"
            }`}
          />
        </button>
      </div>
    );
  }

  handleResolveReport(i: PostReport) {
    let form: ResolvePostReport = {
      report_id: i.props.report.post_report.id,
      resolved: !i.props.report.post_report.resolved,
      auth: authField(),
    };
    WebSocketService.Instance.send(wsClient.resolvePostReport(form));
  }
}
