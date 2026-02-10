import { Component, InfernoNode, RefObject, createRef } from "inferno";
import { Modal } from "bootstrap";
import { modalMixin } from "@components/mixins/modal-mixin";
import { I18NextService } from "@services/I18NextService";

interface CommunityReportModalProps {
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
  show?: boolean;
  children?: InfernoNode;
}

interface CommunityReportModalState {
  loading: boolean;
}

async function handleSubmit(i: CommunityReportModal, event?: Event) {
  if (i.state.loading || !i.reasonRef.current?.value) {
    event?.preventDefault();
    return;
  }

  i.setState({ loading: true });
  await i.props.onSubmit(i.reasonRef.current.value);
  i.setState({ loading: false });
}

@modalMixin
export default class CommunityReportModal extends Component<
  CommunityReportModalProps,
  CommunityReportModalState
> {
  state = {
    loading: false,
  };

  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly reasonRef: RefObject<HTMLInputElement>;
  modal?: Modal;

  constructor(props: CommunityReportModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.reasonRef = createRef();
  }

  render() {
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
                id="community-report-form"
              >
                <div className="row mb-3">
                  <div className="col">
                    <label
                      className="visually-hidden"
                      htmlFor="community-report-reason"
                    >
                      {I18NextService.i18n.t("reason")}
                    </label>
                    <input
                      type="text"
                      id="community-report-reason"
                      className="form-control my-2 my-lg-0"
                      placeholder={I18NextService.i18n.t("reason")}
                      required
                      ref={this.reasonRef}
                    />
                  </div>
                </div>
              </form>
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                onClick={event => handleSubmit(this, event)}
                disabled={this.state.loading}
              >
                {I18NextService.i18n.t("create_report")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => this.props.onCancel()}
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
    this.props.onCancel();
  }
}
