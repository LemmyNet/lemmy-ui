import { None, Option, Some } from "@sniptt/monads";
import { Component, linkEvent } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  ApproveRegistrationApplication,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { i18n } from "../../i18next";
import { WebSocketService } from "../../services";
import { auth, mdToHtml, toOption, toUndefined, wsClient } from "../../utils";
import { PersonListing } from "../person/person-listing";
import { MarkdownTextArea } from "./markdown-textarea";
import { MomentTime } from "./moment-time";

interface RegistrationApplicationProps {
  application: RegistrationApplicationView;
}

interface RegistrationApplicationState {
  denyReason: Option<string>;
  denyExpanded: boolean;
}

export class RegistrationApplication extends Component<
  RegistrationApplicationProps,
  RegistrationApplicationState
> {
  private emptyState: RegistrationApplicationState = {
    denyReason: toOption(
      this.props.application.registration_application.deny_reason
    ),
    denyExpanded: false,
  };

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;
    this.handleDenyReasonChange = this.handleDenyReasonChange.bind(this);
  }

  render() {
    let a = this.props.application;
    let ra = this.props.application.registration_application;
    let accepted = a.creator_local_user.accepted_application;

    return (
      <div>
        <div>
          {i18n.t("applicant")}: <PersonListing person={a.creator} />
        </div>
        <div>
          {i18n.t("created")}:{" "}
          <MomentTime showAgo published={ra.published} updated={None} />
        </div>
        <div>{i18n.t("answer")}:</div>
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
                <div>
                  {i18n.t("deny_reason")}:{" "}
                  <div
                    className="md-div d-inline-flex"
                    dangerouslySetInnerHTML={mdToHtml(ra.deny_reason || "")}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {this.state.denyExpanded && (
          <div class="form-group row">
            <label class="col-sm-2 col-form-label">
              {i18n.t("deny_reason")}
            </label>
            <div class="col-sm-10">
              <MarkdownTextArea
                initialContent={this.state.denyReason}
                onContentChange={this.handleDenyReasonChange}
                placeholder={None}
                buttonTitle={None}
                maxLength={None}
                hideNavigationWarnings
              />
            </div>
          </div>
        )}
        {(!ra.admin_id || (ra.admin_id && !accepted)) && (
          <button
            className="btn btn-secondary mr-2 my-2"
            onClick={linkEvent(this, this.handleApprove)}
            aria-label={i18n.t("approve")}
          >
            {i18n.t("approve")}
          </button>
        )}
        {(!ra.admin_id || (ra.admin_id && accepted)) && (
          <button
            className="btn btn-secondary mr-2"
            onClick={linkEvent(this, this.handleDeny)}
            aria-label={i18n.t("deny")}
          >
            {i18n.t("deny")}
          </button>
        )}
      </div>
    );
  }

  handleApprove(i: RegistrationApplication) {
    i.setState({ denyExpanded: false });
    let form: ApproveRegistrationApplication = {
      id: i.props.application.registration_application.id,
      deny_reason: "",
      approve: true,
      auth: auth(),
    };
    WebSocketService.Instance.send(
      wsClient.approveRegistrationApplication(form)
    );
  }

  handleDeny(i: RegistrationApplication) {
    if (i.state.denyExpanded) {
      i.setState({ denyExpanded: false });
      let form: ApproveRegistrationApplication = {
        id: i.props.application.registration_application.id,
        approve: false,
        deny_reason: toUndefined(i.state.denyReason),
        auth: auth(),
      };
      WebSocketService.Instance.send(
        wsClient.approveRegistrationApplication(form)
      );
    } else {
      i.setState({ denyExpanded: true });
    }
  }

  handleDenyReasonChange(val: string) {
    this.state.denyReason = Some(val);
    this.setState(this.state);
  }
}
