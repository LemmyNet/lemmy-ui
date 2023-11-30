import { Component, RefObject, createRef } from "inferno";
import { I18NextService } from "../../services";
import type { Modal } from "bootstrap";

interface ConfirmModalProps {
  onYes: () => void;
  onNo: () => void;
  message: string;
  show: boolean;
}

export default class ConfirmationModal extends Component<
  ConfirmModalProps,
  any
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly yesButtonRef: RefObject<HTMLButtonElement>;
  modal: Modal;

  constructor(props: ConfirmModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.yesButtonRef = createRef();

    this.handleShow = this.handleShow.bind(this);
  }

  async componentDidMount() {
    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    const Modal = (await import("bootstrap/js/dist/modal")).default;
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

    this.modal.dispose();
  }

  componentDidUpdate({ show: prevShow }: ConfirmModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal.show();
      } else {
        this.modal.hide();
      }
    }
  }

  render() {
    const { message, onYes, onNo } = this.props;

    return (
      <div
        className="modal fade"
        id="confirmModal"
        tabIndex={-1}
        aria-hidden
        aria-label="Confirm"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="moderationModalTitle">
                Confirmation Required
              </h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onNo}
              />
            </header>
            <div className="modal-body d-flex flex-column  align-items-center justify-content-center text-body">
              {message}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={onYes}
                ref={this.yesButtonRef}
              >
                {I18NextService.i18n.t("yes")}
              </button>
              <button type="button" className="btn btn-danger" onClick={onNo}>
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
