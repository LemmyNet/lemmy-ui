import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  PrivateMessageReportView,
  ResolvePrivateMessageReport,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import { mdToHtml, myAuth, wsClient } from "../../utils";
import { Icon } from "../common/icon";
import { PersonListing } from "../person/person-listing";

interface Props {
  report: PrivateMessageReportView;
}

export class PrivateMessageReport extends Component<Props, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  render() {
    let r = this.props.report;
    let pmr = r.private_message_report;
    let tippyContent = i18n.t(
      r.private_message_report.resolved ? "unresolve_report" : "resolve_report"
    );

    return (
      <div>
        <div>
          {i18n.t("creator")}:{" "}
          <PersonListing person={r.private_message_creator} />
        </div>
        <div>
          {i18n.t("message")}:
          <div
            className="md-div"
            dangerouslySetInnerHTML={mdToHtml(pmr.original_pm_text)}
          />
        </div>
        <div>
          {i18n.t("reporter")}: <PersonListing person={r.creator} />
        </div>
        <div>
          {i18n.t("reason")}: {pmr.reason}
        </div>
        {r.resolver && (
          <div>
            {pmr.resolved ? (
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
              pmr.resolved ? "text-success" : "text-danger"
            }`}
          />
        </button>
      </div>
    );
  }

  handleResolveReport(i: PrivateMessageReport) {
    let pmr = i.props.report.private_message_report;
    let auth = myAuth();
    if (auth) {
      let form: ResolvePrivateMessageReport = {
        report_id: pmr.id,
        resolved: !pmr.resolved,
        auth,
      };
      WebSocketService.Instance.send(
        wsClient.resolvePrivateMessageReport(form)
      );
    }
  }
}
