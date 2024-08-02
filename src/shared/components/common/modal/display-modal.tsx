import { Component, InfernoNode, RefObject, createRef } from "inferno";
import type { Modal } from "bootstrap";
import { Spinner } from "../icon";
import { LoadingEllipses } from "../loading-ellipses";
import { modalMixin } from "../../mixins/modal-mixin";

interface DisplayModalProps {
  children: InfernoNode;
  loadingMessage: string;
  title: string;
  onClose: () => void;
  show: boolean;
}

interface DisplayModalState {
  loading: boolean;
}

@modalMixin
export default class DisplayModal extends Component<
  DisplayModalProps,
  DisplayModalState
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  modal?: Modal;
  state: DisplayModalState = {
    loading: false,
  };

  constructor(props: DisplayModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
  }

  render() {
    const { children, loadingMessage, title, onClose } = this.props;
    const { loading } = this.state;

    return (
      <div
        className="modal fade"
        id="display-modal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="#displayModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="displayModalTitle">
                {title}
              </h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </header>
            <div className="modal-body">
              {loading ? (
                <>
                  <Spinner large />
                  <div>
                    {loadingMessage}
                    <LoadingEllipses />
                  </div>
                </>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
