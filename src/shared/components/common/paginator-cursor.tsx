import { Component } from "inferno";
import { I18NextService } from "../../services";
import { PaginationCursor } from "lemmy-js-client";
import { RequestState } from "@services/HttpService";

interface PaginatedResource {
  next_page?: PaginationCursor;
  prev_page?: PaginationCursor;
}

interface PaginatorCursorProps {
  current: PaginationCursor | undefined;
  resource: RequestState<PaginatedResource>;
  onPageChange(cursor?: PaginationCursor): void;
}

function handleNext(i: PaginatorCursor) {
  if (i.nextPage) {
    i.props.onPageChange(i.nextPage);
  }
}

function handlePrev(i: PaginatorCursor) {
  if (i.prevPage) {
    i.props.onPageChange(i.prevPage);
  }
}

function handleFirstPage(i: PaginatorCursor) {
  i.props.onPageChange(undefined);
}

export class PaginatorCursor extends Component<PaginatorCursorProps, any> {
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
        {this.prevPage && (
          <button
            className="btn btn-light border-light-subtle"
            onClick={() => handlePrev(this)}
          >
            {I18NextService.i18n.t("prev")}
          </button>
        )}
        {this.nextPage && (
          <button
            className="btn btn-light border-light-subtle ms-2"
            onClick={() => handleNext(this)}
          >
            {I18NextService.i18n.t("next")}
          </button>
        )}
        {!this.prevPage && !this.nextPage && this.props.current && (
          <button
            className="btn btn-light border-light-subtle ms-2"
            onClick={() => handleFirstPage(this)}
          >
            {I18NextService.i18n.t("back_to_first_page")}
          </button>
        )}
      </div>
    );
  }
}
