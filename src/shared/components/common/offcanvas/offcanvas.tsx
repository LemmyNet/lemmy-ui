import { Component, InfernoNode } from "inferno";
import classNames from "classnames";
import { I18NextService } from "@services/I18NextService";

const transitionMS = 300;

interface OffcanvasProps {
  id: string;
  show: boolean;
  onClose: () => void;
  children: InfernoNode;
  placement?: "start" | "end" | "top" | "bottom";
}

interface OffcanvasState {
  isShown: boolean;
}

export class Offcanvas extends Component<OffcanvasProps, OffcanvasState> {
  state: OffcanvasState = { isShown: false };

  private closeTimer?: ReturnType<typeof setTimeout>;
  private previousBodyOverflow = "";

  componentDidMount() {
    if (this.props.show) {
      this.open();
    }
  }

  componentDidUpdate(prevProps: OffcanvasProps) {
    if (prevProps.show === this.props.show) return;

    if (this.props.show) {
      this.open();
    } else {
      this.close();
    }
  }

  componentWillUnmount() {
    this.clearCloseTimer();
    if (this.props.show) {
      this.restoreScroll();
    }
  }

  render() {
    const { id, show, children, placement = "end", onClose } = this.props;
    const isOpen = show && this.state.isShown;

    if (!show && !this.state.isShown) {
      return null;
    }

    return (
      <>
        <div
          id={id}
          className={classNames("offcanvas", `offcanvas-${placement}`, {
            show: isOpen,
            hiding: !isOpen,
          })}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
        >
          <div className="offcanvas-header">
            <button
              type="button"
              className="btn-close"
              aria-label={I18NextService.i18n.t("close")}
              onClick={onClose}
            />
          </div>
          <div className="offcanvas-body">{children}</div>
        </div>

        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={classNames("offcanvas-backdrop fade border-0 p-0", {
            show: isOpen,
          })}
          onClick={onClose}
        />
      </>
    );
  }

  private open() {
    this.clearCloseTimer();
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", this.handleKeyDown);

    // Allow next tick for CSS enter transition
    this.closeTimer = setTimeout(() => {
      this.setState({ isShown: true });
    }, 0);
  }

  private close() {
    this.restoreScroll();
    this.clearCloseTimer();
    this.closeTimer = setTimeout(
      () => this.setState({ isShown: false }),
      transitionMS,
    );
  }

  private restoreScroll() {
    document.body.style.overflow = this.previousBodyOverflow;
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private clearCloseTimer() {
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      this.props.onClose();
    }
  };
}
