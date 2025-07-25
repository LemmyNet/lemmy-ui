import { Component } from "inferno";
import { I18NextService } from "../../services";

interface PaginatorProps {
  cursor?: string;
  onNext(): void;
  onPrev(): void;
  nextDisabled: boolean;
  disabled?: boolean;
}

type CursorState = {
  prevCursors: string[];
};

export class Paginator extends Component<PaginatorProps, CursorState> {
  state: CursorState = {
    prevCursors: [],
  };

  constructor(props: PaginatorProps, context: any) {
    super(props, context);
  }

  componentDidUpdate(prevProps: Readonly<PaginatorProps>) {
    if (this.props.cursor && this.props.cursor !== prevProps.cursor) {
      this.setState(prevState => {
        prevState.prevCursors.push(this.props.cursor!);
        return prevState;
      });
    }
  }

  render() {
    const { onNext, onPrev, disabled, nextDisabled } = this.props;

    return (
      <div className="paginator my-2">
        {this.state.prevCursors.length > 0 && (
          <button
            className="btn btn-secondary me-2"
            onClick={onPrev}
            disabled={disabled}
          >
            {I18NextService.i18n.t("prev")}
          </button>
        )}
        {!nextDisabled && (
          <button
            className="btn btn-secondary"
            onClick={onNext}
            disabled={this.props.disabled}
          >
            {I18NextService.i18n.t("next")}
          </button>
        )}
      </div>
    );
  }
}
