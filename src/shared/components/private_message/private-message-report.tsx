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

interface Props {
  report: PrivateMessageReportView;
  myUserInfo: MyUserInfo | undefined;
  loading: boolean;
  onResolveReport: (form: ResolvePrivateMessageReport) => void;
}

@tippyMixin
export class PrivateMessageReport extends Component<Props, object> {
  render() {
    const r = this.props.report;
    const pmr = r.private_message_report;
    const tippyContent = I18NextService.i18n.t(
      r.private_message_report.resolved ? "unresolve_report" : "resolve_report",
    );

    return (
      <div className="private-message-report">
        <div>
          {I18NextService.i18n.t("creator")}:{" "}
          <PersonListing
            person={r.private_message_creator}
            banned={r.creator_banned}
            myUserInfo={this.props.myUserInfo}
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
          />
        </div>
        <div>
          {I18NextService.i18n.t("reason")}: {pmr.reason}
        </div>
        {r.resolver && (
          <div>
            {pmr.resolved ? (
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
        <div className="mt-2">
          <ActionButton
            label={tippyContent}
            icon={pmr.resolved ? "check" : "x"}
            loading={this.props.loading}
            inlineWithText
            onClick={() => handleResolveReport(this)}
            iconClass={`text-${pmr.resolved ? "success" : "danger"}`}
          />
        </div>
      </div>
    );
  }
}

function handleResolveReport(i: PrivateMessageReport) {
  i.setState({ loading: true });
  const pmr = i.props.report.private_message_report;
  i.props.onResolveReport({
    report_id: pmr.id,
    resolved: !pmr.resolved,
  });
}
