import { Modal } from "bootstrap";
import { Component, InfernoNode, RefObject } from "inferno";

export function modalMixin<
  P extends { show?: boolean },
  S,
  Base extends new (...args: any[]) => Component<P, S> & {
    readonly modalDivRef: RefObject<HTMLDivElement>;
    handleShow?(): void;
    handleHide?(): void;
  },
>(base: Base, _context?: ClassDecoratorContext<Base>) {
  return class extends base {
    modal?: Modal;
    constructor(...args: any[]) {
      super(...args);
      this.handleHide = this.handleHide?.bind(this);
      this.handleShow = this.handleShow?.bind(this);
    }

    private addModalListener(type: string, listener?: () => void) {
      if (listener) {
        this.modalDivRef.current?.addEventListener(type, listener);
      }
    }

    private removeModalListener(type: string, listener?: () => void) {
      if (listener) {
        this.modalDivRef.current?.addEventListener(type, listener);
      }
    }

    componentDidMount() {
      // Keeping this sync to allow the super implementation to be sync
      import("bootstrap/js/dist/modal").then(
        (res: { default: typeof Modal }) => {
          if (!this.modalDivRef.current) {
            return;
          }

          // bootstrap tries to touch `document` during import, which makes
          // the import fail on the server.

          const Modal = res.default;

          this.addModalListener("shown.bs.modal", this.handleShow);
          this.addModalListener("hidden.bs.modal", this.handleHide);

          this.modal = new Modal(this.modalDivRef.current!);

          if (this.props.show) {
            this.modal.show();
          }
        },
      );
      return super.componentDidMount?.();
    }

    componentWillUnmount() {
      this.removeModalListener("shown.bs.modal", this.handleShow);
      this.removeModalListener("hidden.bs.modal", this.handleHide);

      this.modal?.dispose();
      return super.componentWillUnmount?.();
    }

    componentWillReceiveProps(
      nextProps: Readonly<{ children?: InfernoNode } & P>,
      nextContext: any,
    ) {
      if (nextProps.show !== this.props.show) {
        if (nextProps.show) {
          this.modal?.show();
        } else {
          this.modal?.hide();
        }
      }
      return super.componentWillReceiveProps?.(nextProps, nextContext);
    }
  };
}
