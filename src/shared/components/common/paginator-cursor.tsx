import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { PaginationCursor } from "lemmy-js-client";

interface PaginatorCursorProps {
  prevPage?: PaginationCursor;
  nextPage?: PaginationCursor;
  onNext(val: PaginationCursor): any;
  onPrev(): any;
}

export class PaginatorCursor extends Component<PaginatorCursorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <div className="paginator my-2">
        <button
          className="btn btn-secondary me-2"
          disabled={!this.props.prevPage}
          onClick={linkEvent(this, this.handlePrev)}
        >
          {I18NextService.i18n.t("prev")}
        </button>
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, this.handleNext)}
          disabled={!this.props.nextPage}
        >
          {I18NextService.i18n.t("next")}
        </button>
      </div>
    );
  }

  handlePrev(i: PaginatorCursor) {
    i.props.onPrev();
  }

  handleNext(i: PaginatorCursor) {
    if (i.props.nextPage) {
      i.props.onNext(i.props.nextPage);
    }
  }
}
