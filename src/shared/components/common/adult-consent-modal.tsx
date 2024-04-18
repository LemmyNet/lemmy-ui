import { Component, LinkedEvent, createRef, linkEvent } from "inferno";
import { modalMixin } from "../mixins/modal-mixin";
import { adultConsentLocalStorageKey } from "../../config";
import { setIsoData } from "@utils/app";
import { IsoDataOptionalSite } from "../../interfaces";
import { mdToHtml } from "../../markdown";
import { I18NextService } from "../../services";
import { isBrowser } from "@utils/browser";
import { Helmet } from "inferno-helmet";

interface AdultConsentModalProps {
  contentWarning: string;
  show: boolean;
  onContinue: LinkedEvent<any, Event> | null;
  onBack: LinkedEvent<any, Event> | null;
  redirectCountdown: number;
}

@modalMixin
class AdultConsentModalInner extends Component<AdultConsentModalProps, any> {
  readonly modalDivRef = createRef<HTMLDivElement>();
  readonly continueButtonRef = createRef<HTMLButtonElement>();

  render() {
    const { contentWarning, onContinue, onBack, redirectCountdown } =
      this.props;

    return (
      <div
        className="modal"
        id="adultConsentModal"
        tabIndex={-1}
        aria-hidden
        aria-label="Content warning"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <Helmet
          htmlAttributes={{
            // There is a hack included in create-ssr-html that fixes this
            // attribute early based on localStorage.
            "data-lemmy-blur": this.props.show ? "on" : "off",
          }}
        />
        <div
          className="modal-dialog modal-fullscreen-sm-down"
          data-bs-backdrop="static"
        >
          <div className="modal-content">
            <header className="modal-header justify-content-center">
              <h3 className="modal-title">
                {I18NextService.i18n.t("content_warning")}
              </h3>
            </header>
            {redirectCountdown === Infinity ? (
              <div
                className="modal-body text-center align-middle text-body"
                dangerouslySetInnerHTML={mdToHtml(contentWarning, () =>
                  this.forceUpdate(),
                )}
              />
            ) : (
              <div className="modal-body text-center align-middle text-body">
                {I18NextService.i18n.t("sending_back_message", {
                  seconds: redirectCountdown,
                })}
              </div>
            )}
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={onContinue}
                ref={this.continueButtonRef}
              >
                {I18NextService.i18n.t("continue")}
              </button>
              <button type="button" className="btn btn-danger" onClick={onBack}>
                {I18NextService.i18n.t("go_back")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.continueButtonRef.current?.focus();
  }
}

interface AdultConsentModalState {
  show: boolean;
  redirectCountdown: number;
}

function handleAdultConsent(i: AdultConsentModal) {
  localStorage.setItem(adultConsentLocalStorageKey, "true");
  i.setState({ show: false });
}

function handleAdultConsentGoBack(i: AdultConsentModal) {
  i.setState({ redirectCountdown: 5 });

  i.redirectTimeout = setInterval(() => {
    i.setState(prev => ({
      ...prev,
      redirectCountdown: prev.redirectCountdown - 1,
    }));
  }, 1000);
}

export default class AdultConsentModal extends Component<
  { contentWarning: string },
  AdultConsentModalState
> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  redirectTimeout: NodeJS.Timeout;
  state: AdultConsentModalState = {
    show: false,
    redirectCountdown: Infinity,
  };

  componentWillMount() {
    const siteRes = this.isoData.site_res;

    if (siteRes?.site_view.site.content_warning) {
      if (isBrowser()) {
        if (localStorage.getItem(adultConsentLocalStorageKey) !== "true") {
          this.setState({ show: true });
        } else {
          this.setState({ show: false });
        }
      } else {
        this.setState({ show: true });
      }
    }
  }

  componentDidUpdate() {
    if (this.state.redirectCountdown === 0) {
      this.context.router.history.back();
    }
  }

  componentWillUnmount() {
    clearInterval(this.redirectTimeout);
  }

  render() {
    const { redirectCountdown, show } = this.state;

    return (
      <AdultConsentModalInner
        contentWarning={this.props.contentWarning}
        show={show}
        redirectCountdown={redirectCountdown}
        onBack={linkEvent(this, handleAdultConsentGoBack)}
        onContinue={linkEvent(this, handleAdultConsent)}
      />
    );
  }
}
