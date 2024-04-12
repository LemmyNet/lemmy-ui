import { Component, RefObject, createRef, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import type { Modal } from "bootstrap";
import { Spinner } from "./icon";
import { LoadingEllipses } from "./loading-ellipses";

interface ConfirmationModalProps {
  onYes: () => Promise<void>;
  onNo: () => void;
  message: string;
  loadingMessage: string;
  show: boolean;
}

interface ConfirmationModalState {
  loading: boolean;
}

async function handleYes(i: ConfirmationModal) {
  i.setState({ loading: true });
  await i.props.onYes();
  i.setState({ loading: false });
}

export default class ConfirmationModal extends Component<
  ConfirmationModalProps,
  ConfirmationModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly yesButtonRef: RefObject<HTMLButtonElement>;
  modal?: Modal;
  state: ConfirmationModalState = {
    loading: false,
  };

  constructor(props: ConfirmationModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.yesButtonRef = createRef();

    this.handleShow = this.handleShow.bind(this);
  }

  async componentDidMount() {
    const Modal = (await import("bootstrap/js/dist/modal")).default;

    if (!this.modalDivRef.current) {
      return;
    }

    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );
    this.modal = new Modal(this.modalDivRef.current!);

    if (this.props.show) {
      this.modal.show();
    }
  }

  componentWillUnmount() {
    this.modalDivRef.current?.removeEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    this.modal?.dispose();
  }

  componentDidUpdate({ show: prevShow }: ConfirmationModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal?.show();
      } else {
        this.modal?.hide();
      }
    }
  }

  render() {
    const { message, onNo, loadingMessage } = this.props;
    const { loading } = this.state;

    return (
      <div
        className="modal fade"
        id="confirmModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#confirmationModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="confirmationModalTitle">
                {I18NextService.i18n.t("confirmation_required")}
              </h3>
            </header>
            <div className="modal-body text-center align-middle text-body">
              {loading ? (
                <>
                  <Spinner large />
                  <div>
                    {loadingMessage}
                    <LoadingEllipses />
                  </div>
                </>
              ) : (
                message
              )}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={linkEvent(this, handleYes)}
                ref={this.yesButtonRef}
                disabled={loading}
              >
                {I18NextService.i18n.t("yes")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onNo}
                disabled={loading}
              >
                {I18NextService.i18n.t("no")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.yesButtonRef.current?.focus();
  }
}
