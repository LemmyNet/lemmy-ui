import { Component } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  MyUserInfo,
  PrivateMessageReportView,
  ResolvePrivateMessageReport,
} from "lemmy-js-client";
import { mdToHtmlNoImages } from "@utils/markdown";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { tippyMixin } from "../mixins/tippy-mixin";
import ActionButton from "@components/common/content-actions/action-button";
import ResolveReportModal from "@components/common/modal/resolve-report-modal";

interface Props {
  report: PrivateMessageReportView;
  myUserInfo: MyUserInfo | undefined;
  loading: boolean;
  onResolveReport: (form: ResolvePrivateMessageReport) => void;
}

interface State {
  showResolveReportDialog: boolean;
}

@tippyMixin
export class PrivateMessageReport extends Component<Props, State> {
  state: State = {
    showResolveReportDialog: false,
  };

  render() {
    const r = this.props.report;
    const pmr = r.private_message_report;
    const resolved = pmr.resolved;
    const resolveReason = r.private_message_report.resolve_reason;

    return (
      <div className="private-message-report">
        <div>
          {I18NextService.i18n.t("creator")}:{" "}
          <PersonListing
            person={r.private_message_creator}
            banned={r.creator_banned}
            myUserInfo={this.props.myUserInfo}
            muted={false}
          />
        </div>
        <div>
          {I18NextService.i18n.t("message")}:
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtmlNoImages(
              pmr.original_pm_text,
              () => this.forceUpdate(),
            )}
          />
        </div>
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
          {I18NextService.i18n.t("reason")}: {pmr.reason}
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
            {resolveReason && (
              <div>
                {I18NextService.i18n.t(
                  resolved ? "resolve_reason" : "unresolve_reason",
                )}
                : {resolveReason}
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
        {this.state.showResolveReportDialog && (
          <ResolveReportModal
            isResolved={resolved}
            onSubmit={reason => handleResolveReport(this, reason)}
            onCancel={() => this.setState({ showResolveReportDialog: false })}
            show
            loading={this.props.loading}
          />
        )}
      </div>
    );
  }
}

function handleResolveReport(i: PrivateMessageReport, reason?: string) {
  const pmr = i.props.report.private_message_report;
  i.props.onResolveReport({
    report_id: pmr.id,
    resolved: !pmr.resolved,
    resolve_reason: reason,
  });
  i.setState({ showResolveReportDialog: false });
}
