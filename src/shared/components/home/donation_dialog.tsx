import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import * as sanitizeHtml from "sanitize-html";
import { HttpService, I18NextService } from "../../services";
import { donateLemmyUrl } from "../../config";

interface Props {
  site?: GetSiteResponse;
}

interface State {
  show: boolean;
}

export class DonationDialog extends Component<Props, State> {
  state: State = { show: this.initializeShow() };

  constructor(props: any, context: any) {
    super(props, context);
    this.clickDonate = this.clickDonate.bind(this);
    this.clickHide = this.clickHide.bind(this);
    this.hideDialog = this.hideDialog.bind(this);
  }

  initializeShow(): boolean {
    const lastNotifDate = new Date(
      this.props.site?.my_user?.local_user_view.local_user
        .last_donation_notification ?? Number.MAX_SAFE_INTEGER,
    );

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return lastNotifDate < oneYearAgo;
  }

  render() {
    if (this.state.show) {
      return (
        <div class="alert border-info bg-light-subtle fade show" role="alert">
          <div class="d-flex">
            <h4 class="alert-heading flex-grow-1">
              {I18NextService.i18n.t("donation_dialog_title")}
            </h4>
            <button
              type="button"
              class="btn-close position-relative"
              onClick={this.clickHide}
              aria-label={I18NextService.i18n.t("donation_dialog_button_hide")}
            ></button>
          </div>
          <div
            class="card-text"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                I18NextService.i18n.t("donation_dialog_message"),
              ),
            }}
          ></div>
          <div class="mt-3">
            <button class="btn btn-info" onClick={this.clickDonate}>
              {I18NextService.i18n.t("donation_dialog_button_donate")}
            </button>
          </div>
        </div>
      );
    }
  }

  async clickDonate() {
    window.open(donateLemmyUrl, "_blank")?.focus();
    await this.hideDialog();
  }

  async clickHide() {
    await this.hideDialog();
  }

  async hideDialog() {
    await HttpService.client.donation_dialog_shown();
    const site = this.props.site;
    if (site?.my_user !== undefined) {
      site!.my_user!.local_user_view.local_user.last_donation_notification =
        new Date(0).toString();
    }
    this.setState({ show: false });
  }
}
