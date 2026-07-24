import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  Community,
  CommunityReportView,
  MyUserInfo,
  ResolveCommunityReport,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import { CommunityHeader } from "./community-header";
import ActionButton from "@components/common/content-actions/action-button";
import ConcludeReportModal from "@components/common/modal/conclude-report-modal";

interface Props {
  report: CommunityReportView;
  myUserInfo: MyUserInfo | undefined;
  loading: boolean;
  onResolveReport: (form: ResolveCommunityReport) => void;
}

interface State {
  showResolveReportDialog: boolean;
}

const reportElements = [
  "name",
  "title",
  "summary",
  "sidebar",
  "icon",
  "banner",
] as const;

@tippyMixin
export class CommunityReport extends Component<Props, State> {
  state: State = {
    showResolveReportDialog: false,
  };

  render() {
    const r = this.props.report;
    const cr = r.community_report;
    const resolved = cr.resolved;
    const conclusion = r.community_report.conclusion;

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
        {mergedCommunity.sidebar && (
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(mergedCommunity.sidebar, () =>
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
            muted={false}
          />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {cr.reason}
        </div>
        {r.resolver && (
          <div>
            {resolved ? (
              <T i18nKey="resolved_by">
                #
                <PersonListing
                  person={r.resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                  muted={false}
                />
              </T>
            ) : (
              <T i18nKey="unresolved_by">
                #
                <PersonListing
                  person={r.resolver}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                  muted={false}
                />
              </T>
            )}
            {conclusion && (
              <div>
                {I18NextService.i18n.t(
                  resolved ? "resolve_reason" : "unresolve_reason",
                )}
                : {conclusion}
              </div>
            )}
          </div>
        )}
        <div className="mt-2">
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
        <ConcludeReportModal
          isResolved={resolved}
          conclusion={conclusion}
          onSubmit={reason => handleResolveReport(this, reason)}
          onCancel={() => this.setState({ showResolveReportDialog: false })}
          show={this.state.showResolveReportDialog}
          loading={this.props.loading}
        />
      </div>
    );
  }
}

function handleResolveReport(i: CommunityReport, reason?: string) {
  const cr = i.props.report.community_report;
  i.props.onResolveReport({
    report_id: cr.id,
    resolved: !cr.resolved,
    conclusion: reason,
  });
  i.setState({ showResolveReportDialog: false });
}
