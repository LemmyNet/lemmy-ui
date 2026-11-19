import { setIsoData, WithHead } from "@utils/app";
import { validEmail } from "@utils/helpers";
import { Component, FormEvent } from "inferno";
import { Link, RouteComponentProps, RouterContext } from "inferno-router";
import { SuccessResponse } from "lemmy-js-client";
import { I18NextService } from "@services/I18NextService";
import {
  EMPTY_REQUEST,
  HttpService,
  LOADING_REQUEST,
  RequestState,
} from "@services/HttpService";
import { htmlTags } from "../../common/html-tags";
import { Spinner } from "../../common/icon";
import { simpleScrollMixin } from "../../mixins/scroll-mixin";

interface State {
  email: string;
  resendRes: RequestState<SuccessResponse>;
}

@simpleScrollMixin
export class ResendVerificationEmail extends Component<
  RouteComponentProps<Record<string, never>> & WithHead,
  State
> {
  private isoData = setIsoData(this.context);

  state: State = { email: "", resendRes: EMPTY_REQUEST };

  async handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = this.state.email.trim();
    if (this.state.resendRes.state === "loading" || !validEmail(email)) {
      return;
    }

    this.setState({ resendRes: LOADING_REQUEST });
    try {
      const resendRes = await HttpService.client.resendVerificationEmail({
        email,
      });
      this.setState({
        resendRes:
          resendRes.state === "empty"
            ? { state: "failed", err: new Error("empty_response") }
            : resendRes,
      });
    } catch {
      this.setState({
        resendRes: { state: "failed", err: new Error("network_error") },
      });
    }
  }

  render() {
    const { email, resendRes } = this.state;
    const loading = resendRes.state === "loading";
    const title = I18NextService.i18n.t("resend_verification_email");
    htmlTags({
      head: this.props.head,
      title: `${title} - ${this.isoData.siteRes?.site_view.site.name}`,
      context: this.context as RouterContext,
    });
    return (
      <div className="container-lg">
        <div className="col-12 col-lg-6 col-md-8 m-auto">
          <h1 className="h4 mb-4">{title}</h1>
          <p>{I18NextService.i18n.t("resend_verification_email_help")}</p>
          {resendRes.state === "success" && (
            <p className="alert alert-success" role="status">
              {I18NextService.i18n.t("resend_verification_email_requested")}
            </p>
          )}
          {resendRes.state === "failed" && (
            <p className="alert alert-danger" role="alert">
              {I18NextService.i18n.t(
                ["rate_limit_error", "too_many_requests"].includes(
                  resendRes.err.name,
                )
                  ? "rate_limit_error"
                  : "resend_verification_email_failed",
              )}
            </p>
          )}
          <form
            onSubmit={event => this.handleSubmit(event)}
            aria-busy={loading ? "true" : "false"}
          >
            <div className="mb-3">
              <label className="form-label" htmlFor="resend-verification-email">
                {I18NextService.i18n.t("email")}
              </label>
              <input
                id="resend-verification-email"
                className="form-control"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={loading}
                value={email}
                onInput={event =>
                  this.setState({
                    email: event.target.value,
                    resendRes: EMPTY_REQUEST,
                  })
                }
              />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !validEmail(email.trim())}
              >
                {loading ? <Spinner /> : title}
              </button>
              <Link className="btn btn-secondary" to="/login">
                {I18NextService.i18n.t("login")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
