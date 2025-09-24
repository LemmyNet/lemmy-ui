import { Component } from "inferno";
import { MyUserInfo } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";
import { T } from "inferno-i18next-dess";
import { donateLemmyUrl } from "@utils/config";

interface Props {
  myUserInfo?: MyUserInfo;
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
      this.props.myUserInfo?.local_user_view.local_user
        .last_donation_notification_at ?? Number.MAX_SAFE_INTEGER,
    );

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return lastNotifDate < oneYearAgo;
  }

  render() {
    if (this.state.show) {
      return (
        <div class="alert alert-info fade show" role="alert">
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
          <div>
            <T i18nKey="donation_dialog_message">
              <br />
            </T>
          </div>
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
    await HttpService.client.donationDialogShown();
    const my_user = this.props.myUserInfo;
    if (my_user !== undefined) {
      my_user!.local_user_view.local_user.last_donation_notification_at =
        new Date(0).toString();
    }
    this.setState({ show: false });
  }
}
