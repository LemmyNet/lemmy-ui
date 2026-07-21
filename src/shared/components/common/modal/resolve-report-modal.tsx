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

// Delimiter to separate resolve and unresolve reasons
const REASON_DELIMITER = "|";

@modalMixin
export default class ResolveReportModal extends Component<
  ResolveReportModalProps,
  ResolveReportModalState
> {
  modalDivRef: RefObject<HTMLDivElement>;
  private reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;
  state: ResolveReportModalState = {
    reason: getCurrentReasonFromProps(this.props),
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

    // Determine placeholder text based on current action
    const placeholderText = I18NextService.i18n.t(
      isResolved ? "unresolve_reason" : "resolve_reason",
    );

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
                  onSubmit={e => handleSubmit(this, e)}
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
                        placeholder={placeholderText}
                        required={false}
                        value={reason || ""}
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

function getCurrentReasonFromProps(
  props: ResolveReportModalProps,
): string | undefined {
  const { resolveReason, isResolved } = props;
  if (!resolveReason) return undefined;

  const parts = resolveReason.split(REASON_DELIMITER);
  // Format: "resolve_reason|unresolve_reason"
  if (parts.length === 2) {
    return !isResolved ? parts[0] : parts[1];
  }
  return resolveReason;
}

function combineReasons(
  props: ResolveReportModalProps,
  newReason?: string,
): string | undefined {
  const { resolveReason, isResolved } = props;
  const trimmedNewReason = newReason?.trim();

  // Get existing parts
  let resolveReasonPart = "";
  let unresolveReasonPart = "";

  if (resolveReason && resolveReason.includes(REASON_DELIMITER)) {
    const parts = resolveReason.split(REASON_DELIMITER);
    resolveReasonPart = parts[0] || "";
    unresolveReasonPart = parts[1] || "";
  }

  // Update the appropriate part based on current action
  if (!isResolved) {
    // We're resolving, update resolve reason
    resolveReasonPart = trimmedNewReason || "";
  } else {
    // We're unresolving, update unresolve reason
    unresolveReasonPart = trimmedNewReason || "";
  }

  // Return with delimiter if either side has a value
  if (resolveReasonPart || unresolveReasonPart) {
    return `${resolveReasonPart}${REASON_DELIMITER}${unresolveReasonPart}`;
  }
  return undefined;
}

function handleReasonChange(
  i: ResolveReportModal,
  e: FormEvent<HTMLInputElement>,
) {
  i.setState({ reason: e.currentTarget.value });
}

function handleSubmit(i: ResolveReportModal, e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  const trimmedReason = i.state.reason?.trim();

  // Combine resolve and unresolve reasons with delimiter
  const combinedReason = combineReasons(i.props, trimmedReason);

  i.props.onSubmit(combinedReason);
}

function handleCancel(i: ResolveReportModal) {
  i.props.onCancel();
  // Reset reason to the current value from props
  i.setState({ reason: getCurrentReasonFromProps(i.props) });
}
