import { myAuthRequired } from "@utils/app";
import { Component, InfernoNode, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  PrivateMessageReportView,
  ResolvePrivateMessageReport,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { mdToHtml } from "../../markdown";
import { Icon, Spinner } from "../common/icon";
import { PersonListing } from "../person/person-listing";

interface Props {
  report: PrivateMessageReportView;
  onResolveReport(form: ResolvePrivateMessageReport): void;
}

interface State {
  loading: boolean;
}

export class PrivateMessageReport extends Component<Props, State> {
  state: State = {
    loading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
  }

  componentWillReceiveProps(
    nextProps: Readonly<{ children?: InfernoNode } & Props>
  ): void {
    if (this.props != nextProps) {
      this.setState({ loading: false });
    }
  }

  render() {
    const r = this.props.report;
    const pmr = r.private_message_report;
    const tippyContent = i18n.t(
      r.private_message_report.resolved ? "unresolve_report" : "resolve_report"
    );

    return (
      <div className="private-message-report">
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
          {this.state.loading ? (
            <Spinner />
          ) : (
            <Icon
              icon="check"
              classes={`icon-inline ${
                pmr.resolved ? "text-success" : "text-danger"
              }`}
            />
          )}
        </button>
      </div>
    );
  }

  handleResolveReport(i: PrivateMessageReport) {
    i.setState({ loading: true });
    const pmr = i.props.report.private_message_report;
    i.props.onResolveReport({
      report_id: pmr.id,
      resolved: !pmr.resolved,
      auth: myAuthRequired(),
    });
  }
}
