import { Component, FormEvent, RefObject, createRef } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import { Spinner } from "../icon";
import { randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { modalMixin } from "../../mixins/modal-mixin";

interface ResolveReportModalProps {
  isResolved: boolean;
  resolveReason?: string;
  onSubmit: (reason?: string) => void;
  onCancel: () => void;
  show: boolean;
  loading: boolean;
}

interface ResolveReportModalState {
  reason?: string;
}

@modalMixin
export default class ResolveReportModal extends Component<
  ResolveReportModalProps,
  ResolveReportModalState
> {
  modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;
  state: ResolveReportModalState = {
    reason: this.props.resolveReason ?? undefined,
  };

  constructor(props: ResolveReportModalProps, context: object) {
    super(props, context);
    this.modalDivRef = createRef();
    this.reasonRef = createRef();
  }

  render() {
    const { reason } = this.state;
    const { isResolved, loading } = this.props;
    const reasonId = `resolve-reason-${randomStr()}`;
    const formId = `resolve-form-${randomStr()}`;

    return (
      <div
        className="modal fade"
        data-bs-backdrop="static"
        id="resolveReportModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#resolveReportModalTitle"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="resolveReportModalTitle">
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
                  onSubmit={event => handleSubmit(this, event)}
                  className="p-3 w-100 container"
                  id={formId}
                >
                  {!isResolved && (
                    <div className="row mb-3">
                      <div className="col-12">
                        <label className="visually-hidden" htmlFor={reasonId}>
                          {I18NextService.i18n.t("reason")}
                        </label>
                        <input
                          type="text"
                          id={reasonId}
                          className="form-control my-2 my-lg-0"
                          placeholder={I18NextService.i18n.t("reason")}
                          required={false}
                          value={reason}
                          onInput={event => handleReasonChange(this, event)}
                          ref={this.reasonRef}
                        />
                      </div>
                    </div>
                  )}
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
  i: ResolveReportModal,
  event: FormEvent<HTMLInputElement>,
) {
  i.setState({ reason: event.currentTarget.value });
}

function handleSubmit(
  i: ResolveReportModal,
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  const trimmedReason = i.state.reason?.trim();
  const resolved = i.props.isResolved;

  // Only pass reason if resolving and a reason was provided
  const reason = !resolved && trimmedReason ? trimmedReason : undefined;

  i.props.onSubmit(reason);
}

function handleCancel(i: ResolveReportModal) {
  i.props.onCancel();
  i.setState({ reason: i.props.resolveReason ?? undefined });
}
