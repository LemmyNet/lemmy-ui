import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";
import { PaginationCursor } from "lemmy-js-client";
import { RequestState } from "@services/HttpService";
import { DirectionalCursor } from "@utils/types";
import { directionalCursor } from "@utils/helpers";

interface PaginatedResource {
  next_page?: PaginationCursor;
  prev_page?: PaginationCursor;
}

interface PaginatorCursorProps {
  current: DirectionalCursor | undefined;
  resource: RequestState<PaginatedResource>;
  onPageChange(cursor?: DirectionalCursor): void;
}

function handleNext(i: PaginatorCursor) {
  if (i.nextPage) {
    i.props.onPageChange(directionalCursor(i.nextPage, false));
  }
}

function handlePrev(i: PaginatorCursor) {
  if (i.prevPage) {
    i.props.onPageChange(directionalCursor(i.prevPage, true));
  }
}

function handleFirstPage(i: PaginatorCursor) {
  i.props.onPageChange(undefined);
}

export class PaginatorCursor extends Component<PaginatorCursorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }

  get nextPage(): PaginationCursor | undefined {
    return this.props.resource.state === "success"
      ? this.props.resource.data.next_page
      : undefined;
  }

  get prevPage(): PaginationCursor | undefined {
    return this.props.resource.state === "success"
      ? this.props.current
        ? this.props.resource.data.prev_page
        : undefined
      : undefined;
  }

  render() {
    return (
      <div className="paginator my-2">
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, handlePrev)}
          disabled={!this.prevPage}
        >
          {I18NextService.i18n.t("prev")}
        </button>
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, handleNext)}
          disabled={!this.nextPage}
        >
          {I18NextService.i18n.t("next")}
        </button>
        {!this.prevPage && !this.nextPage && this.props.current && (
          <button
            className="btn btn-secondary"
            onClick={linkEvent(this, handleFirstPage)}
          >
            {I18NextService.i18n.t("back_to_first_page")}
          </button>
        )}
      </div>
    );
  }
}
