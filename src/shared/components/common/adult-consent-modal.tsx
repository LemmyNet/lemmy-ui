import { Component, LinkedEvent, createRef, linkEvent } from "inferno";
import { modalMixin } from "../mixins/modal-mixin";
import { adultConsentLocalStorageKey } from "../../config";
import { setIsoData } from "@utils/app";
import { IsoDataOptionalSite } from "../../interfaces";

interface AdultConsentModalProps {
  contentWarning: string;
  show: boolean;
  onContinue: LinkedEvent<any, Event> | null;
  onBack: LinkedEvent<any, Event> | null;
}

@modalMixin
class AdultConsentModalInner extends Component<AdultConsentModalProps, any> {
  readonly modalDivRef = createRef<HTMLDivElement>();
  readonly continueButtonRef = createRef<HTMLButtonElement>();

  render() {
    const { contentWarning, onContinue, onBack } = this.props;

    return (
      <div
        className="modal fade"
        id="adultConsentModal"
        tabIndex={-1}
        aria-hidden
        aria-label="Content warning"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-body text-center align-middle text-body">
              {contentWarning}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={onContinue}
                ref={this.continueButtonRef}
              >
                Continue
              </button>
              <button type="button" className="btn btn-danger" onClick={onBack}>
                Go back
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
}

function handleAdultConsent(i: AdultConsentModal) {
  localStorage.setItem(adultConsentLocalStorageKey, "true");
  i.setState({ show: false });
}

function handleAdultConsentGoBack(i: AdultConsentModal) {
  i.context.router.history.back();
}

export default class AdultConsentModal extends Component<
  { contentWarning: string },
  AdultConsentModalState
> {
  private isoData: IsoDataOptionalSite = setIsoData(this.context);
  state: AdultConsentModalState = {
    show: false,
  };

  componentDidMount(): void {
    const siteRes = this.isoData.site_res;

    if (
      siteRes?.site_view.site.content_warning &&
      !(siteRes?.my_user || localStorage.getItem(adultConsentLocalStorageKey))
    ) {
      this.setState({ show: true });
    }
  }

  render() {
    return (
      <AdultConsentModalInner
        contentWarning={this.props.contentWarning}
        show={this.state.show}
        onBack={linkEvent(this, handleAdultConsentGoBack)}
        onContinue={linkEvent(this, handleAdultConsent)}
      />
    );
  }
}
