import { Component, RefObject, createRef, linkEvent } from "inferno";
import { Modal } from "bootstrap";
import { modalMixin } from "@components/mixins/modal-mixin";
import { I18NextService } from "@services/I18NextService";

interface ImageUploadConfirmModalModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  pendingImageURL: string;
  show?: boolean;
}

@modalMixin
export default class ImageUploadConfirmModalModal extends Component<
  ImageUploadConfirmModalModalProps,
  Record<never, never>
> {
  readonly modalDivRef: RefObject<HTMLDivElement>;
  readonly okButtonRef: RefObject<HTMLButtonElement>;
  modal?: Modal;

  constructor(props: ImageUploadConfirmModalModalProps, context: any) {
    super(props, context);

    this.modalDivRef = createRef();
    this.okButtonRef = createRef();
  }

  render() {
    return (
      <div
        className="modal fade"
        id="imageUploadConfirmModal"
        tabIndex={-1}
        aria-hidden
        aria-labelledby="imageUploadConfirmModalTitle"
        data-bs-backdrop="static"
        ref={this.modalDivRef}
      >
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <header className="modal-header">
              <h3 className="modal-title" id="imageUploadConfirmModalTitle">
                {I18NextService.i18n.t("upload_and_publish_image_title")}
              </h3>
            </header>
            <div className="modal-body text-center align-middle text-body">
              <div class="row">
                {I18NextService.i18n.t("upload_and_publish_image_desc")}
              </div>
              <div class="row mt-2">
                <div class="col">
                  <img
                    class="img-fluid mx-auto"
                    style="max-height: 50vh"
                    src={this.props.pendingImageURL}
                    alt=""
                  />
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="btn btn-success"
                ref={this.okButtonRef}
                onClick={linkEvent(this, this.props.onConfirm)}
              >
                {I18NextService.i18n.t("yes")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={linkEvent(this, this.props.onCancel)}
              >
                {I18NextService.i18n.t("no")}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  handleShow() {
    this.okButtonRef.current?.focus();
  }
}
