import { Component, FormEvent, RefObject, createRef } from "inferno";
import { I18NextService } from "../../../services/I18NextService";
import { Spinner } from "../icon";
import { randomStr } from "@utils/helpers";
import type { Modal } from "bootstrap";
import classNames from "classnames";
import { modalMixin } from "../../mixins/modal-mixin";
import { LoadingEllipses } from "../loading-ellipses";

interface ResolveReportModalProps {
  isResolved: boolean;
  onSubmit: (form: { reason: string; action: "resolve" | "unresolve" }) => void;
  onCancel: () => void;
  show: boolean;
  loading: boolean;
}

interface ResolveReportModalState {
  reason: string;
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
    reason: "",
  };

  constructor(props: ResolveReportModalProps, context: object) {
    super(props, context);
    this.modalDivRef = createRef();
    this.reasonRef = createRef();
  }

  handleReasonChange = (event: FormEvent<HTMLInputElement>) => {
    this.setState({ reason: event.currentTarget.value });
  };

  handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const action = this.props.isResolved ? "unresolve" : "resolve";
    let reason = this.state.reason.trim();

    // Only set default if no reason provided
    if (!reason) {
      reason =
        action === "resolve"
          ? "Resolved by moderator"
          : "Unresolved by moderator";
    }

    this.props.onSubmit({ reason, action });
    this.setState({ reason: "" });
  };

  handleCancel = () => {
    this.props.onCancel();
    this.setState({ reason: "" });
  };

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
                  <div>
                    {I18NextService.i18n.t(
                      isResolved ? "unresolving_report" : "resolving_report",
                    )}
                    <LoadingEllipses />
                  </div>
                </>
              ) : (
                <form
                  onSubmit={this.handleSubmit}
                  className="p-3 w-100 container"
                  id={formId}
                >
                  <div className="row mb-3">
                    <div className="col-12">
                      <label className="visually-hidden" htmlFor={reasonId}>
                        {I18NextService.i18n.t("reason")}
                      </label>
                      <input
                        type="text"
                        id={reasonId}
                        className="form-control my-2 my-lg-0"
                        placeholder={I18NextService.i18n.t(
                          isResolved
                            ? "unresolve_reason_optional"
                            : "resolve_reason_optional",
                        )}
                        required={false}
                        value={reason}
                        onInput={this.handleReasonChange}
                        ref={this.reasonRef}
                      />
                      {isResolved && (
                        <small className="text-muted">
                          {I18NextService.i18n.t(
                            "unresolve_will_set_default_reason",
                          )}
                        </small>
                      )}
                    </div>
                  </div>
                  {!isResolved && (
                    <div className="row">
                      <div className="col-12">
                        <div className="alert alert-info">
                          <small>
                            {I18NextService.i18n.t(
                              "resolve_report_confirmation",
                            )}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}
                  {isResolved && (
                    <div className="row">
                      <div className="col-12">
                        <div className="alert alert-warning">
                          <small>
                            {I18NextService.i18n.t(
                              "unresolve_report_confirmation",
                            )}
                          </small>
                        </div>
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
                {I18NextService.i18n.t(isResolved ? "unresolve" : "resolve")}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={this.handleCancel}
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
    if (this.reasonRef && this.reasonRef.current) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        this.reasonRef.current?.focus();
      }, 100);
    }
  }
}
