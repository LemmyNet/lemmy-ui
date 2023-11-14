import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { PaginationCursor } from "lemmy-js-client";

interface PaginatorCursorProps {
  nextPage?: PaginationCursor;
  onNext(val: PaginationCursor): void;
}

function handleNext(i: PaginatorCursor) {
  if (i.props.nextPage) {
    i.props.onNext(i.props.nextPage);
  }
}

export class PaginatorCursor extends Component<PaginatorCursorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <div className="paginator my-2">
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, handleNext)}
          disabled={!this.props.nextPage}
        >
          {I18NextService.i18n.t("next")}
        </button>
      </div>
    );
  }
}
