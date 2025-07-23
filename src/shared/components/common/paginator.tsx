import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";

interface PaginatorProps {
  cursor?: string;
  onNext(cursor?: string): void;
  onPrev(cursor: string): void;
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
    return (
      <div className="paginator my-2">
        {this.state.prevCursors.length > 0 && (
          <button
            className="btn btn-secondary me-2"
            onClick={linkEvent(this, this.handlePrev)}
            disabled={this.props.disabled}
          >
            {I18NextService.i18n.t("prev")}
          </button>
        )}
        {!this.props.nextDisabled && (
          <button
            className="btn btn-secondary"
            onClick={linkEvent(this, this.handleNext)}
            disabled={this.props.disabled}
          >
            {I18NextService.i18n.t("next")}
          </button>
        )}
      </div>
    );
  }

  handlePrev(i: Paginator) {
    const prevCursor = i.state.prevCursors[i.state.prevCursors.length - 1];
    i.setState(state => {
      state.prevCursors.pop();
      return state;
    });
    i.props.onPrev(prevCursor);
  }

  handleNext(i: Paginator) {
    i.props.onNext(i.props.cursor);
  }
}
