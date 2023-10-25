import { Component, linkEvent } from "inferno";
import { I18NextService } from "../../services";

interface PaginatorProps {
  page: number;
  onChange(val: number): any;
  nextDisabled: boolean;
}

export class Paginator extends Component<PaginatorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <div className="paginator my-2">
        <button
          className="btn btn-secondary me-2"
          disabled={this.props.page === 1}
          onClick={linkEvent(this, this.handlePrev)}
        >
          {I18NextService.i18n.t("prev")}
        </button>
        <button
          className="btn btn-secondary"
          onClick={linkEvent(this, this.handleNext)}
          disabled={this.props.nextDisabled || false}
        >
          {I18NextService.i18n.t("next")}
        </button>
      </div>
    );
  }

  handlePrev(i: Paginator) {
    i.props.onChange(i.props.page - 1);
  }

  handleNext(i: Paginator) {
    i.props.onChange(i.props.page + 1);
  }
}
