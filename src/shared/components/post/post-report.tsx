import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  LocalSite,
  MyUserInfo,
  PersonView,
  PostReportView,
  PostView,
  ResolvePostReport,
} from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { PostListing } from "./post-listing";
import { EMPTY_REQUEST } from "../../services/HttpService";
import { tippyMixin } from "../mixins/tippy-mixin";

interface PostReportProps {
  report: PostReportView;
  enableNsfw?: boolean;
  showAdultConsentModal: boolean;
  myUserInfo: MyUserInfo | undefined;
  localSite: LocalSite;
  admins: PersonView[];
  onResolveReport(form: ResolvePostReport): void;
}

interface PostReportState {
  loading: boolean;
}

@tippyMixin
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
}
