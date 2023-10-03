import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { toast } from "../../toast";

interface TotpModalProps {
  /**Takes totp as param, returns whether submit was successful*/
  onSubmit: (totp: string) => Promise<boolean>;
  type: "login" | "remove" | "generate";
  secretUrl?: string;
}

interface TotpModalState {
  totp: string;
  qrCode?: string;
}

const TOTP_LENGTH = 6;

async function handleSubmit(modal: TotpModal, totp: string) {
  const succeeded = await modal.props.onSubmit(totp);

  modal.setState({ totp: "" });
  if (succeeded) {
    document.getElementById("totp-close-button")?.click();
  } else {
    document.getElementById(`totp-input-0`)?.focus();
  }
}

function handleInput(
  { modal, i }: { modal: TotpModal; i: number },
  event: any,
) {
  modal.setState(prev => ({ ...prev, totp: prev.totp + event.target.value }));
  document.getElementById(`totp-input-${i + 1}`)?.focus();

  const { totp } = modal.state;
  if (totp.length >= TOTP_LENGTH) {
    handleSubmit(modal, totp);
  }
}

function handleKeyUp(
  { modal, i }: { modal: TotpModal; i: number },
  event: any,
) {
  if (event.key === "Backspace" && i > 0) {
    event.preventDefault();

    modal.setState(prev => ({
      ...prev,
      totp: prev.totp.slice(0, prev.totp.length - 1),
    }));
    document.getElementById(`totp-input-${i - 1}`)?.focus();
  }
}

function handlePaste(modal: TotpModal, event: any) {
  event.preventDefault();
  const text: string = event.clipboardData.getData("text");

  if (text.length > TOTP_LENGTH || isNaN(Number(text))) {
    toast("Invalid TOTP: Must be string of six digits", "danger");
    modal.setState({ totp: "" });
  } else {
    modal.setState({ totp: text });
    handleSubmit(modal, text);
  }
}

export default class TotpModal extends Component<
  TotpModalProps,
  TotpModalState
> {
  state: TotpModalState = {
    totp: "",
  };

  constructor(props: TotpModalProps, context: any) {
    super(props, context);

    this.clearTotp = this.clearTotp.bind(this);
    this.handleShow = this.handleShow.bind(this);
  }

  async componentDidMount() {
    document
      .getElementById("totpModal")
      ?.addEventListener("shown.bs.modal", this.handleShow);

    document
      .getElementById("totpModal")
      ?.addEventListener("hidden.bs.modal", this.clearTotp);
  }

  componentWillUnmount() {
    document
      .getElementById("totpModal")
      ?.removeEventListener("shown.bs.modal", this.handleShow);

    document
      .getElementById("totpModal")
      ?.removeEventListener("hidden.bs.modal", this.clearTotp);
  }

  render() {
    const { type, secretUrl } = this.props;
    const { totp } = this.state;

    return (
      <div
        className="modal fade"
        id="totpModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#totpModalTitle"
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="totpModalTitle">
                {type === "generate"
                  ? "Generate TOTP"
                  : type === "remove"
                  ? "Remove TOTP"
                  : "Enter TOTP"}
              </h3>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                id="totp-close-button"
              />
            </header>
            <div className="modal-body">
              {type === "generate" && (
                <div className="mx-auto">
                  <a
                    className="btn btn-secondary mx-auto d-block totp-link"
                    href={secretUrl}
                  >
                    Click here for your TOTP link
                  </a>
                  <div className="mx-auto mt-3 w-50 h-50 text-center">
                    <span className="fw-semibold">
                      or scan this QR code in your authenticator app
                    </span>
                    <img
                      src={this.state.qrCode}
                      className="d-block mt-1 mx-auto"
                      alt="TOTP QR code"
                    />
                  </div>
                </div>
              )}
              <form id="totp-form">
                <label
                  className="form-label ms-2 mt-4 fw-bold"
                  id="totp-input-label"
                  htmlFor="totp-input-0"
                >
                  Enter TOTP
                </label>
                <div className="d-flex justify-content-between align-items-center p-2">
                  {Array.from(Array(TOTP_LENGTH).keys()).map(i => (
                    <input
                      key={
                        i /*While using indices as keys is usually bad practice, in this case we don't have to worry about the order of the list items changing.*/
                      }
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={totp[i] ?? ""}
                      disabled={totp.length !== i}
                      aria-labelledby="totp-input-label"
                      id={`totp-input-${i}`}
                      className="form-control form-control-lg mx-2"
                      onInput={linkEvent({ modal: this, i }, handleInput)}
                      onKeyUp={linkEvent({ modal: this, i }, handleKeyUp)}
                      onPaste={linkEvent(this, handlePaste)}
                    />
                  ))}
                </div>
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                data-bs-dismiss="modal"
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
    document.getElementById("totp-input-0")?.focus();

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
