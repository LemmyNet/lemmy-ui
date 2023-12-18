import { Component, InfernoNode, linkEvent } from "@/inferno";
import { Trans as T } from "react-i18next";
import {
  ApproveRegistrationApplication,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { mdToHtml } from "../../markdown";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { Spinner } from "./icon";
import { MarkdownTextArea } from "./markdown-textarea";
import { MomentTime } from "./moment-time";

interface RegistrationApplicationProps {
  application: RegistrationApplicationView;
  onApproveApplication(form: ApproveRegistrationApplication): void;
}

interface RegistrationApplicationState {
  denyReason?: string;
  denyExpanded: boolean;
  approveLoading: boolean;
  denyLoading: boolean;
}

export class RegistrationApplication extends Component<
  RegistrationApplicationProps,
  RegistrationApplicationState
> {
  state: RegistrationApplicationState = {
    denyReason: this.props.application.registration_application.deny_reason,
    denyExpanded: false,
    approveLoading: false,
    denyLoading: false,
  };

  constructor(props: any, context: any) {
    super(props, context);
    this.handleDenyReasonChange = this.handleDenyReasonChange.bind(this);
  }
  componentWillReceiveProps(
    nextProps: Readonly<
      { children?: InfernoNode } & RegistrationApplicationProps
    >,
  ): void {
    if (this.props !== nextProps) {
      this.setState({
        denyExpanded: false,
        approveLoading: false,
        denyLoading: false,
      });
    }
  }

  render() {
    const a = this.props.application;
    const ra = this.props.application.registration_application;
    const accepted = a.creator_local_user.accepted_application;

    return (
      <div className="registration-application">
        <div>
          {I18NextService.i18n.t("applicant")}:{" "}
          <PersonListing person={a.creator} />
        </div>
        <div>
          {I18NextService.i18n.t("created")}:{" "}
          <MomentTime showAgo published={ra.published} />
        </div>
        <div>{I18NextService.i18n.t("answer")}:</div>
        <div className="md-div" dangerouslySetInnerHTML={mdToHtml(ra.answer)} />

        {a.admin && (
          <div>
            {accepted ? (
              <T i18nKey="approved_by">
                #
                <PersonListing person={a.admin} />
              </T>
            ) : (
              <div>
                <T i18nKey="denied_by">
                  #
                  <PersonListing person={a.admin} />
                </T>
                {ra.deny_reason && (
                  <div>
                    {I18NextService.i18n.t("deny_reason")}:{" "}
                    <div
                      className="md-div d-inline-flex"
                      dangerouslySetInnerHTML={mdToHtml(ra.deny_reason)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {this.state.denyExpanded && (
          <div className="mb-3 row">
            <label className="col-sm-2 col-form-label">
              {I18NextService.i18n.t("deny_reason")}
            </label>
            <div className="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.denyReason}
                onContentChange={this.handleDenyReasonChange}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
              />
            </div>
          </div>
        )}
        {(!ra.admin_id || (ra.admin_id && !accepted)) && (
          <button
            className="btn btn-secondary me-2 my-2"
            onClick={linkEvent(this, this.handleApprove)}
            aria-label={I18NextService.i18n.t("approve")}
          >
            {this.state.approveLoading ? (
              <Spinner />
            ) : (
              I18NextService.i18n.t("approve")
            )}
          </button>
        )}
        {(!ra.admin_id || (ra.admin_id && accepted)) && (
          <button
            className="btn btn-secondary me-2"
            onClick={linkEvent(this, this.handleDeny)}
            aria-label={I18NextService.i18n.t("deny")}
          >
            {this.state.denyLoading ? (
              <Spinner />
            ) : (
              I18NextService.i18n.t("deny")
            )}
          </button>
        )}
      </div>
    );
  }

  handleApprove(i: RegistrationApplication) {
    i.setState({ denyExpanded: false, approveLoading: true });
    i.props.onApproveApplication({
      id: i.props.application.registration_application.id,
      approve: true,
    });
  }

  handleDeny(i: RegistrationApplication) {
    if (i.state.denyExpanded) {
      i.setState({ denyExpanded: false, denyLoading: true });
      i.props.onApproveApplication({
        id: i.props.application.registration_application.id,
        approve: false,
        deny_reason: i.state.denyReason,
      });
    } else {
      i.setState({ denyExpanded: true });
    }
  }

  handleDenyReasonChange(val: string) {
    this.setState({ denyReason: val });
  }
}
