import {
  Component,
  MouseEventHandler,
  RefObject,
  createRef,
  linkEvent,
} from "@/inferno";
import { I18NextService } from "../../services";
import { toast } from "../../toast";
import type { Modal } from "bootstrap";

interface TotpModalProps {
  /**Takes totp as param, returns whether submit was successful*/
  onSubmit: (totp: string) => Promise<boolean>;
  onClose: MouseEventHandler;
  type: "login" | "remove" | "generate";
  secretUrl?: string;
  show?: boolean;
}

interface TotpModalState {
  totp: string;
  qrCode?: string;
}

const TOTP_LENGTH = 6;

async function handleSubmit(i: TotpModal, totp: string) {
  const successful = await i.props.onSubmit(totp);

  if (!successful) {
    i.setState({ totp: "" });
    i.inputRef.current?.focus();
  }
}

function handleInput(i: TotpModal, event: any) {
  if (isNaN(event.target.value)) {
    return;
  }

  i.setState({
    totp: event.target.value,
  });

  const { totp } = i.state;
  if (totp.length >= TOTP_LENGTH) {
    handleSubmit(i, totp);
  }
}

function handlePaste(i: TotpModal, event: any) {
  event.preventDefault();
  const text: string = event.clipboardData.getData("text")?.trim();

  if (text.length > TOTP_LENGTH || isNaN(Number(text))) {
    toast(I18NextService.i18n.t("invalid_totp_code"), "danger");
    i.clearTotp();
  } else {
    i.setState({ totp: text });

    if (text.length === TOTP_LENGTH) {
      handleSubmit(i, text);
    }
  }
}

export default class TotpModal extends Component<
  TotpModalProps,
  TotpModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly inputRef: RefObject<HTMLInputElement>;
  modal: Modal;
  state: TotpModalState = {
    totp: "",
  };

  constructor(props: TotpModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.inputRef = createRef();

    this.clearTotp = this.clearTotp.bind(this);
    this.handleShow = this.handleShow.bind(this);
  }

  async componentDidMount() {
    this.modalDivRef.current?.addEventListener(
      "shown.bs.modal",
      this.handleShow,
    );

    this.modalDivRef.current?.addEventListener(
      "hidden.bs.modal",
      this.clearTotp,
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

    this.modalDivRef.current?.removeEventListener(
      "hidden.bs.modal",
      this.clearTotp,
    );

    this.modal.dispose();
  }

  componentDidUpdate({ show: prevShow }: TotpModalProps) {
    if (!!prevShow !== !!this.props.show) {
      if (this.props.show) {
        this.modal.show();
      } else {
        this.modal.hide();
      }
    }
  }

  render() {
    const { type, secretUrl, onClose } = this.props;
    const { totp } = this.state;

    return (
      <div
        className="modal fade"
        id="totpModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#totpModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="totpModalTitle">
                {I18NextService.i18n.t(
                  type === "generate"
                    ? "enable_totp"
                    : type === "remove"
                      ? "disable_totp"
                      : "enter_totp_code",
                )}
              </h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </header>
            <div className="modal-body d-flex flex-column  align-items-center justify-content-center">
              {type === "generate" && (
                <div>
                  <a
                    className="btn btn-secondary mx-auto d-block totp-link"
                    href={secretUrl}
                  >
                    {I18NextService.i18n.t("totp_link")}
                  </a>
                  <div className="mx-auto mt-3 w-50 h-50 text-center">
                    <strong className="fw-semibold">
                      {I18NextService.i18n.t("totp_qr_segue")}
                    </strong>
                    <img
                      src={this.state.qrCode}
                      className="d-block mt-1 mx-auto"
                      alt={I18NextService.i18n.t("totp_qr")}
                    />
                  </div>
                </div>
              )}
              <form id="totp-form">
                <label
                  className="form-label ms-2 mt-4 fw-bold"
                  htmlFor="totp-input"
                >
                  {I18NextService.i18n.t("enter_totp_code")}
                </label>
                <div className="d-flex justify-content-between align-items-center p-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={TOTP_LENGTH}
                    id="totp-input"
                    className="form-control form-control-lg mx-2 p-1 p-md-2 text-center"
                    onInput={linkEvent(this, handleInput)}
                    onPaste={linkEvent(this, handlePaste)}
                    ref={this.inputRef}
                    enterKeyHint="done"
                    value={totp}
                  />
                </div>
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                onClick={onClose}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  clearTotp() {
    this.setState({ totp: "" });
  }

  async handleShow() {
    this.inputRef.current?.focus();

    if (this.props.type === "generate") {
      const { getSVG } = await import("@shortcm/qr-image/lib/svg");

      this.setState({
        qrCode: URL.createObjectURL(
          new Blob([(await getSVG(this.props.secretUrl!)).buffer], {
            type: "image/svg+xml",
          }),
        ),
      });
    }
  }
}
