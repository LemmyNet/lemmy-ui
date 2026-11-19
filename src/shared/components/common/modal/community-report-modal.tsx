import { Component, InfernoNode, RefObject, createRef } from "inferno";
import { Modal } from "bootstrap";
import { modalMixin } from "@components/mixins/modal-mixin";
import { I18NextService } from "@services/I18NextService";
import { randomStr } from "@utils/helpers";

interface CommunityReportModalProps {
  onSubmit: (reason: string) => void;
  onCancel: () => void;
  show?: boolean;
  loading?: boolean;
  error?: string;
  children?: InfernoNode;
}

type CommunityReportModalState = object;

function handleSubmit(i: CommunityReportModal, event: Event) {
  event.preventDefault();

  if (i.props.loading || !i.reasonRef.current?.value.trim()) {
    return;
  }

  i.props.onSubmit(i.reasonRef.current.value);
}

@modalMixin
export default class CommunityReportModal extends Component<
  CommunityReportModalProps,
  CommunityReportModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly reasonRef: RefObject<HTMLInputElement>;
  readonly formId = `community-report-form-${randomStr()}`;
  readonly reasonId = `community-report-reason-${randomStr()}`;
  modal?: Modal;

  constructor(props: CommunityReportModalProps, context: object) {
    super(props, context);

    this.modalDivRef = createRef();
    this.reasonRef = createRef();
  }

  render() {
    const { loading, error } = this.props;

    return (
      <div
        className="modal fade"
        id="communityReportModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="communityReportModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="communityReportModalTitle">
                {I18NextService.i18n.t("report_community")}
              </h3>
            </header>
            <div className="modal-body text-center align-middle text-body">
              <form
                onSubmit={event => handleSubmit(this, event)}
                className="p-3 w-100 container"
                id={this.formId}
              >
                <div className="row mb-3">
                  <div className="col">
                    <label className="visually-hidden" htmlFor={this.reasonId}>
                      {I18NextService.i18n.t("reason")}
                    </label>
                    <input
                      type="text"
                      id={this.reasonId}
                      className="form-control my-2 my-lg-0"
                      placeholder={I18NextService.i18n.t("reason")}
                      required
                      ref={this.reasonRef}
                    />
                  </div>
                </div>
                {error && (
                  <div
                    className="alert alert-danger py-1 px-2 small text-start"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="submit"
                form={this.formId}
                className="btn btn-success"
                disabled={loading}
              >
                {I18NextService.i18n.t("create_report")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => this.props.onCancel()}
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

  handleHide() {
    if (this.reasonRef.current) {
      this.reasonRef.current.value = "";
    }
    this.props.onCancel();
  }
}
