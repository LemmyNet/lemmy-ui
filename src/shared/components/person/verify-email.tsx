import { setIsoData } from "@utils/app";
import { Component, linkEvent } from "inferno";
import { SuccessResponse } from "lemmy-js-client";
import { I18NextService } from "../../services";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "../../services/HttpService";
import { toast } from "@utils/app";
import { HtmlTags } from "../common/html-tags";
import { Spinner } from "../common/icon";
import { simpleScrollMixin } from "../mixins/scroll-mixin";
import { Link, RouteComponentProps, RouterContext } from "inferno-router";

interface State {
  verifyRes: RequestState<SuccessResponse>;
}

@simpleScrollMixin
export class VerifyEmail extends Component<
  RouteComponentProps<{ token: string }>,
  State
> {
  private isoData = setIsoData(this.context);

  state: State = {
    verifyRes: EMPTY_REQUEST,
  };

  async verify() {
    if (this.state.verifyRes.state === "loading") {
      return;
    }
    this.setState({
      verifyRes: LOADING_REQUEST,
    });

    const verifyRes = await HttpService.client.verifyEmail({
      token: this.props.match.params.token,
    });
    this.setState({
      verifyRes:
        verifyRes.state === "empty"
          ? { state: "failed", err: new Error("empty_response") }
          : verifyRes,
    });

    if (verifyRes.state === "success") {
      toast(I18NextService.i18n.t("email_verified"));
      this.props.history.push("/login");
    }
  }

  componentDidMount() {
    void this.verify();
  }

  handleRetry(this: void, i: VerifyEmail) {
    void i.verify();
  }

  get documentTitle(): string {
    return `${I18NextService.i18n.t("verify_email")} - ${
      this.isoData.siteRes?.site_view.site.name
    }`;
  }

  render() {
    return (
      <div className="verify-email container-lg">
        <HtmlTags
          title={this.documentTitle}
          context={this.context as RouterContext}
        />
        <div className="row">
          <div className="col-12 col-lg-6 offset-lg-3 mb-4">
            <h1 className="h4 mb-4">{I18NextService.i18n.t("verify_email")}</h1>
            {this.state.verifyRes.state === "loading" && (
              <h5>
                <Spinner large />
              </h5>
            )}
            {this.state.verifyRes.state === "failed" &&
              this.verificationError()}
          </div>
        </div>
      </div>
    );
  }

  verificationError() {
    const { verifyRes } = this.state;
    if (verifyRes.state !== "failed") {
      return;
    }

    // Tokens are deleted after verification, so the API cannot distinguish an
    // already used link from an invalid one. Do not claim the account is verified.
    const unavailable = verifyRes.err.name === "not_found";
    return (
      <>
        <div
          className={`alert ${unavailable ? "alert-warning" : "alert-danger"}`}
          role="alert"
        >
          <p className={unavailable ? "mb-2" : "mb-0"}>
            {I18NextService.i18n.t(
              unavailable
                ? "email_verification_link_unavailable"
                : "email_verification_failed",
            )}
          </p>
          {unavailable && (
            <p className="mb-0">
              {I18NextService.i18n.t(
                "email_verification_already_confirmed_hint",
              )}
            </p>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {!unavailable && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={linkEvent(this, this.handleRetry)}
            >
              {I18NextService.i18n.t("email_verification_retry")}
            </button>
          )}
          <Link
            className={`btn ${unavailable ? "btn-primary" : "btn-secondary"}`}
            to="/login"
          >
            {I18NextService.i18n.t("login")}
          </Link>
        </div>
      </>
    );
  }
}
