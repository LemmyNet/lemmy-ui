import { Component, InfernoNode, createRef } from "inferno";
import classNames from "classnames";
import { I18NextService } from "@services/I18NextService";

const transitionMS = 300;

interface OffcanvasProps {
  id: string;
  show: boolean;
  onClose: () => void;
  children: InfernoNode;
  placement?: "start" | "end" | "top" | "bottom";
  title?: string;
  isAlwaysMounted?: boolean;
  headerClasses?: string;
  bodyClasses?: string;
}

interface OffcanvasState {
  isShown: boolean;
}

export class Offcanvas extends Component<OffcanvasProps, OffcanvasState> {
  state: OffcanvasState = { isShown: false };

  private closeTimer?: ReturnType<typeof setTimeout>;
  private previousBodyOverflow = "";
  private offcanvasRef = createRef<HTMLDivElement>();

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
    const {
      id,
      show,
      children,
      placement = "end",
      onClose,
      title,
      isAlwaysMounted = false,
      headerClasses,
      bodyClasses,
    } = this.props;
    const isOpen = show && this.state.isShown;
    const isHiding = !show && this.state.isShown;
    const showBackdrop = show || this.state.isShown;
    const isDialogActive = !isAlwaysMounted || isOpen;

    if (!isAlwaysMounted && !show && !this.state.isShown) {
      return null;
    }

    return (
      <>
        <div
          ref={this.offcanvasRef}
          id={id}
          className={classNames("offcanvas", `offcanvas-${placement}`, {
            show: isOpen,
            hiding: isHiding,
          })}
          tabIndex={isDialogActive ? -1 : undefined}
          role={isDialogActive ? "dialog" : undefined}
          aria-modal={isDialogActive ? "true" : undefined}
          aria-labelledby={title ? `${id}Label` : undefined}
        >
          <div className={classNames("offcanvas-header", headerClasses)}>
            {title && (
              <h5
                className="offcanvas-title fs-6 fw-semibold"
                id={`${id}Label`}
              >
                {title}
              </h5>
            )}
            <button
              type="button"
              className="btn-close"
              aria-label={I18NextService.i18n.t("close")}
              onClick={onClose}
            />
          </div>
          <div className={classNames("offcanvas-body", bodyClasses)}>
            {children}
          </div>
        </div>

        {showBackdrop && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={classNames("offcanvas-backdrop fade border-0 p-0", {
              show: isOpen,
            })}
            onClick={onClose}
          />
        )}
      </>
    );
  }

  private open() {
    this.clearCloseTimer();
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("resize", this.resizeHandler);

    this.closeTimer = setTimeout(() => {
      this.setState({ isShown: true });
    }, 0);
  }

  private close() {
    this.restoreScroll();
    this.clearCloseTimer();

    // Delay hiding the component to allow the CSS close transition to finish
    this.closeTimer = setTimeout(
      () => this.setState({ isShown: false }),
      transitionMS,
    );
  }

  private restoreScroll() {
    document.body.style.overflow = this.previousBodyOverflow;
    document.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private clearCloseTimer() {
    if (this.closeTimer !== undefined) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  private keyDownHandler = (event: KeyboardEvent) => handleKeyDown(this, event);

  private resizeHandler = () => {
    const element = this.offcanvasRef.current;
    if (!this.props.show || !element) return;

    const { position } = getComputedStyle(element);
    // Close when CSS switches the drawer inline or hides an ancestor via display: none;
    if (position !== "fixed" || element.getClientRects().length === 0) {
      this.props.onClose();
    }
  };
}

function handleKeyDown(offcanvas: Offcanvas, event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.stopPropagation();
    offcanvas.props.onClose();
  }
}
