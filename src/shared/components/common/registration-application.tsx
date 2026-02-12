import { Component, InfernoNode } from "inferno";
import { T } from "inferno-i18next-dess";
import {
  ApproveRegistrationApplication,
  MyUserInfo,
  RegistrationApplicationView,
} from "lemmy-js-client";
import { mdToHtml } from "@utils/markdown";
import { I18NextService } from "../../services";
import { PersonListing } from "../person/person-listing";
import { Spinner } from "./icon";
import { MarkdownTextArea } from "./markdown-textarea";
import { MomentTime } from "./moment-time";

interface RegistrationApplicationProps {
  application: RegistrationApplicationView;
  myUserInfo: MyUserInfo | undefined;
  onApproveApplication: (form: ApproveRegistrationApplication) => void;
  loading: boolean;
}

interface RegistrationApplicationState {
  denyReason?: string;
  denyExpanded: boolean;
}

export class RegistrationApplication extends Component<
  RegistrationApplicationProps,
  RegistrationApplicationState
> {
  state: RegistrationApplicationState = {
    denyReason: this.props.application.registration_application.deny_reason,
    denyExpanded: false,
  };

  componentWillReceiveProps(
    nextProps: Readonly<
      { children?: InfernoNode } & RegistrationApplicationProps
    >,
  ) {
    if (this.props !== nextProps) {
      this.setState({
        denyExpanded: false,
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
          <PersonListing
            person={a.creator}
            banned={false}
            myUserInfo={this.props.myUserInfo}
          />
        </div>
        <div>
          {I18NextService.i18n.t("created")}:{" "}
          <MomentTime showAgo published={ra.published_at} />
        </div>
        <div>{I18NextService.i18n.t("answer")}:</div>
        <div
          className="md-div"
          dangerouslySetInnerHTML={mdToHtml(ra.answer, () =>
            this.forceUpdate(),
          )}
        />
        {a.creator_local_user.email && (
          <div>
            {I18NextService.i18n.t("email")}:&nbsp;
            <a href={`mailto:${a.creator_local_user.email}`}>
              {a.creator_local_user.email}
            </a>
          </div>
        )}

        {a.admin && (
          <div>
            {accepted ? (
              <T i18nKey="approved_by">
                #
                <PersonListing
                  person={a.admin}
                  banned={false}
                  myUserInfo={this.props.myUserInfo}
                />
              </T>
            ) : (
              <div>
                <T i18nKey="denied_by">
                  #
                  <PersonListing
                    person={a.admin}
                    banned={false}
                    myUserInfo={this.props.myUserInfo}
                  />
                </T>
                {ra.deny_reason && (
                  <div>
                    {I18NextService.i18n.t("deny_reason")}:{" "}
                    <div
                      className="md-div"
                      dangerouslySetInnerHTML={mdToHtml(ra.deny_reason, () =>
                        this.forceUpdate(),
                      )}
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
                onContentChange={val => handleDenyReasonChange(this, val)}
                hideNavigationWarnings
                allLanguages={[]}
                siteLanguages={[]}
                myUserInfo={this.props.myUserInfo}
              />
            </div>
          </div>
        )}
        {(!ra.admin_id || (ra.admin_id && !accepted)) && (
          <button
            className="btn btn-light border-light-subtle me-2 my-2"
            onClick={() => handleApprove(this)}
            aria-label={I18NextService.i18n.t("approve")}
          >
            {this.props.loading ? (
              <Spinner />
            ) : (
              I18NextService.i18n.t("approve")
            )}
          </button>
        )}
        {(!ra.admin_id || (ra.admin_id && accepted)) && (
          <button
            className="btn btn-light border-light-subtle me-2"
            onClick={() => handleDeny(this)}
            aria-label={I18NextService.i18n.t("deny")}
          >
            {this.props.loading ? <Spinner /> : I18NextService.i18n.t("deny")}
          </button>
        )}
      </div>
    );
  }
}

function handleApprove(i: RegistrationApplication) {
  i.setState({ denyExpanded: false });
  i.props.onApproveApplication({
    id: i.props.application.registration_application.id,
    approve: true,
  });
}

function handleDeny(i: RegistrationApplication) {
  if (i.state.denyExpanded) {
    i.setState({ denyExpanded: false });
    i.props.onApproveApplication({
      id: i.props.application.registration_application.id,
      approve: false,
      deny_reason: i.state.denyReason,
    });
  } else {
    i.setState({ denyExpanded: true });
  }
}

function handleDenyReasonChange(i: RegistrationApplication, val: string) {
  i.setState({ denyReason: val });
}
