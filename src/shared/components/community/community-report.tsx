import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  Community,
  CommunityReportView,
  MyUserInfo,
  ResolveCommunityReport,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { CommunityHeader } from "./community-header";

interface Props {
  report: CommunityReportView;
  myUserInfo: MyUserInfo | undefined;
  onResolveReport(form: ResolveCommunityReport): void;
}

interface State {
  loading: boolean;
}

const reportElements = [
  "name",
  "title",
  "summary",
  "description",
  "icon",
  "banner",
] as const;

@tippyMixin
export class CommunityReport extends Component<Props, State> {
  state: State = {
    loading: false, // when resolving
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>,
  ): void {
    if (this.props !== nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const r = this.props.report;
    const cr = r.community_report;
    const tippyContent = I18NextService.i18n.t(
      r.community_report.resolved ? "unresolve_report" : "resolve_report",
    );

    const mergedCommunity: Community = { ...r.community };
    reportElements.forEach(key => {
      mergedCommunity[key] =
        r.community_report[`original_community_${key}`] ?? "";
    });

    return (
      <div className="community-report">
        <CommunityHeader
          community={mergedCommunity}
          urlCommunityName={r.community.name}
          myUserInfo={this.props.myUserInfo}
        />
        {mergedCommunity.summary && <div>{mergedCommunity.summary}</div>}
        {mergedCommunity.description && (
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(mergedCommunity.description, () =>
              this.forceUpdate(),
            )}
          />
        )}
        <div>
          {I18NextService.i18n.t("reporter")}:{" "}
          <PersonListing
            person={r.creator}
            banned={false}
            myUserInfo={this.props.myUserInfo}
          />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {cr.reason}
        </div>
        {r.resolver && (
          <div>
            {cr.resolved ? (
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
                cr.resolved ? "text-success" : "text-danger"
              }`}
            />
          )}
        </button>
      </div>
    );
  }

  handleResolveReport(i: CommunityReport) {
    i.setState({ loading: true });
    const cr = i.props.report.community_report;
    i.props.onResolveReport({
      report_id: cr.id,
      resolved: !cr.resolved,
    });
  }
}
