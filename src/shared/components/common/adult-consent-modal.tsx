import { Component, LinkedEvent, RefObject, createRef } from "inferno";
import { modalMixin } from "../mixins/modal-mixin";

interface AdultConsentModalProps {
  contentWarning: string;
  show: boolean;
  onContinue: LinkedEvent<any, Event> | null;
  onBack: () => void;
}

@modalMixin
export default class AdultConsentModal extends Component<
  AdultConsentModalProps,
  any
> {
  readonly modalDivRef: RefObject<HTMLDivElement> = createRef();
  readonly continueButtonRef: RefObject<HTMLButtonElement> = createRef();

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
