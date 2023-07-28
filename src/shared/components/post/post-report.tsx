import { myAuthRequired } from "@utils/app";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import { PostReportView, PostView, ResolvePostReport } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { PostListing } from "./post-listing";

interface PostReportProps {
  report: PostReportView;
  onResolveReport(form: ResolvePostReport): void;
}

interface PostReportState {
  loading: boolean;
}

export class PostReport extends Component<PostReportProps, PostReportState> {
  state: PostReportState = {
    loading: false,
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
      creator_banned_from_community: r.creator_banned_from_community,
      counts: r.counts,
      subscribed: "NotSubscribed",
      saved: false,
      read: false,
      creator_blocked: false,
      my_vote: r.my_vote,
      unread_comments: 0,
    };

    return (
      <div className="post-report">
        <PostListing
          post_view={pv}
          showCommunity={true}
          enableDownvotes={true}
          enableNsfw={true}
          viewOnly={true}
          allLanguages={[]}
          siteLanguages={[]}
          hideImage
          // All of these are unused, since its view only
          onPostEdit={() => {}}
          onPostVote={() => {}}
          onPostReport={() => {}}
          onBlockPerson={() => {}}
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
        />
        <div>
          {I18NextService.i18n.t("reporter")}:{" "}
          <PersonListing person={r.creator} />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {r.post_report.reason}
        </div>
        {resolver && (
          <div>
            {r.post_report.resolved ? (
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
      </div>
    );
  }

  handleResolveReport(i: PostReport) {
    i.setState({ loading: true });
    i.props.onResolveReport({
      report_id: i.props.report.post_report.id,
      resolved: !i.props.report.post_report.resolved,
      auth: myAuthRequired(),
    });
  }
}
