import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";

interface TotpModalProps {
  onSubmit: (totp: string) => void;
  type: "login" | "remove" | "generate";
  secretUrl?: string;
}
interface TotpModalState {
  totp: string;
}

const TOTP_LENGTH = 6;

function focusInput() {
  document.getElementById("totp-input-0")?.focus();
}

function handleInput(
  { modal, i }: { modal: TotpModal; i: number },
  event: any,
) {
  const { totp } = modal.state;

  if (totp.length >= TOTP_LENGTH) {
    modal.props.onSubmit(totp);
  } else {
    modal.setState(prev => ({
      totp: prev.totp + event.target.value,
    }));
    document.getElementById(`totp-input-${i + 1}`)?.focus();
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
  }

  componentDidMount() {
    document
      .getElementById("totpModal")
      ?.addEventListener("shown.bs.modal", focusInput);
  }

  componentWillUnmount() {
    document
      .getElementById("totpModal")
      ?.removeEventListener("shown.bs.modal", focusInput);
  }

  render() {
    const { type } = this.props;
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
              />
            </header>
            <form
              id="totp-form"
              className="modal-body d-flex flex-column justify-content-center"
            >
              <label
                className="form-label"
                id="totp-input-label"
                htmlFor="totp-input-0"
              >
                Enter TOTP
              </label>
              <div className="d-flex justify-content-between align-items-center">
                {Array(6).map((_, i) => (
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
                    className="form-control form-control-lg"
                    onInput={linkEvent({ modal: this, i }, handleInput)}
                  />
                ))}
              </div>
            </form>
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
}
