import { Component } from "inferno";
import { MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { T } from "inferno-i18next-dess";
import { donateLemmyUrl } from "@utils/config";

interface Props {
  myUserInfo?: MyUserInfo;
  onHideDialog(): void;
}

interface State {
  show: boolean;
}

export class DonationDialog extends Component<Props, State> {
  state: State = { show: this.initializeShow() };

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
        <div className="alert alert-info fade show" role="alert">
          <div className="d-flex">
            <h4 className="alert-heading flex-grow-1">
              {I18NextService.i18n.t("donation_dialog_title")}
            </h4>
            <button
              type="button"
              className="btn-close position-relative"
              onClick={() => handleClickHide(this)}
              aria-label={I18NextService.i18n.t("donation_dialog_button_hide")}
            ></button>
          </div>
          <div>
            <T i18nKey="donation_dialog_message">
              <br />
            </T>
          </div>
          <div className="mt-3">
            <button
              className="btn btn-info"
              onClick={() => handleClickDonate(this)}
            >
              {I18NextService.i18n.t("donation_dialog_button_donate")}
            </button>
          </div>
        </div>
      );
    }
  }
}

function handleClickDonate(i: DonationDialog) {
  handleHideDialog(i);
  window.open(donateLemmyUrl, "_blank")?.focus();
}

function handleClickHide(i: DonationDialog) {
  handleHideDialog(i);
}

function handleHideDialog(i: DonationDialog) {
  i.setState({ show: false });
  i.props.onHideDialog();
}
