import { Component, FormEvent, RefObject, createRef } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import { Spinner } from "../icon";
import { randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { modalMixin } from "../../mixins/modal-mixin";

interface ConcludeReportModalProps {
  isResolved: boolean;
  conclusion?: string;
  onSubmit: (reason?: string) => void;
  onCancel: () => void;
  show: boolean;
  loading: boolean;
}

interface ConcludeReportModalState {
  reason?: string;
}

@modalMixin
export default class ConcludeReportModal extends Component<
  ConcludeReportModalProps,
  ConcludeReportModalState
> {
  modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;
  state: ConcludeReportModalState = {
    reason: this.props.conclusion ?? undefined,
  };

  constructor(props: ConcludeReportModalProps, context: object) {
    super(props, context);
    this.modalDivRef = createRef();
    this.reasonRef = createRef();
  }

  render() {
    const { reason } = this.state;
    const { isResolved, loading } = this.props;
    const conclusionId = `conclusion-${randomStr()}`;
    const formId = `conclusion-form-${randomStr()}`;

    return (
      <div
        className="modal fade"
        data-bs-backdrop="static"
        id="concludeReportModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#concludeReportModalTitle"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="concludeReportModalTitle">
                {I18NextService.i18n.t(
                  isResolved ? "unresolve_report" : "resolve_report",
                )}
              </h3>
            </header>
            <div
              className={classNames("modal-body text-body", {
                "text-center": loading,
              })}
            >
              {loading ? (
                <>
                  <Spinner large />
                </>
              ) : (
                <form
                  onSubmit={e => handleSubmit(this, e)}
                  className="p-3 w-100 container"
                  id={formId}
                >
                  <div className="row mb-3">
                    <div className="col-12">
                      <label htmlFor={conclusionId}>
                        {I18NextService.i18n.t("reason")}
                      </label>
                      <input
                        type="text"
                        id={conclusionId}
                        className="form-control my-2 my-lg-0"
                        required={false}
                        value={reason}
                        onInput={e => handleReasonChange(this, e)}
                        ref={this.reasonRef}
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>
            <footer className="modal-footer">
              <button
                type="submit"
                className={classNames("btn", {
                  "btn-success": !isResolved,
                  "btn-warning": isResolved,
                  "border-light-subtle me-3": true,
                })}
                form={formId}
                disabled={loading}
              >
                {I18NextService.i18n.t(
                  isResolved ? "unresolve_report" : "resolve_report",
                )}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => handleCancel(this)}
                disabled={loading}
              >
                {I18NextService.i18n.t("cancel")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.reasonRef.current?.focus();
  }
}

function handleReasonChange(
  i: ConcludeReportModal,
  e: FormEvent<HTMLInputElement>,
) {
  i.setState({ reason: e.currentTarget.value });
}

function handleSubmit(i: ConcludeReportModal, e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const trimmedReason = i.state.reason?.trim();
  // This will still send an empty string instead of None to the backend
  // so that it overrides the value, this is intended
  i.props.onSubmit(trimmedReason);
}

function handleCancel(i: ConcludeReportModal) {
  i.props.onCancel();
  i.setState({ reason: i.props.conclusion ?? undefined });
}
