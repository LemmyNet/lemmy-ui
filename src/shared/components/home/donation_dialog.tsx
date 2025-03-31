import { Component } from "inferno";
import { GetSiteResponse } from "lemmy-js-client";
import { HttpService, I18NextService } from "../../services";

interface DonationDialogProps {
  site?: GetSiteResponse;
}

export class DonationDialog extends Component<DonationDialogProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
    this.donationDialogShown = this.donationDialogShown.bind(this);
    this.donationDialogShownHidePermanently =
      this.donationDialogShownHidePermanently.bind(this);
    this.hide_dialog = this.hide_dialog.bind(this);
  }

  render() {
    const last_donation_notification = new Date(
      this.props.site?.my_user?.local_user_view.local_user
        .last_donation_notification ?? 0,
    );
    var year_ago = new Date();
    year_ago.setFullYear(year_ago.getFullYear() - 1);
    if (last_donation_notification < year_ago) {
      return (
        <div class="position-absolute end-0 bottom-0 p-5 col-5">
          <div class="text-bg-light z-3 p-3 card border-primary">
            <div class="card-body">
              <h5 class="card-title">
                {I18NextService.i18n.t("donation_dialog_title")}
              </h5>
              <div class="card-text">
                {I18NextService.i18n.t("donation_dialog_message")}
              </div>
              <div>
                <div class="mt-2 grid gap-2">
                  <a
                    href="https://join-lemmy.org/donate"
                    class="btn btn-primary col-6"
                    target="_blank"
                    onClick={this.donationDialogShown}
                  >
                    {I18NextService.i18n.t("donation_dialog_button_donate")}
                  </a>
                  <button
                    class="btn btn-outline-secondary col-6"
                    onClick={this.donationDialogShown}
                  >
                    {I18NextService.i18n.t("donation_dialog_button_hide")}
                  </button>
                  <button
                    class="btn btn-outline-dark border-0 col-12"
                    onClick={this.donationDialogShownHidePermanently}
                  >
                    {I18NextService.i18n.t(
                      "donation_dialog_button_hide_permanently",
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
  async donationDialogShown() {
    this.hide_dialog();
    await HttpService.client.donation_dialog_shown(false);
  }

  async donationDialogShownHidePermanently() {
    await HttpService.client.donation_dialog_shown(true);
    this.hide_dialog();
  }

  hide_dialog() {
    const site = this.props.site;
    if (site?.my_user !== undefined) {
      site!.my_user!.local_user_view.local_user.last_donation_notification =
        new Date(0).toString();
    }
    this.forceUpdate();
  }
}
