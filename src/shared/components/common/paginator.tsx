import { Component, linkEvent } from "inferno";
import { i18n } from "../../i18next";

interface PaginatorProps {
  page: number;
  onChange(val: number): any;
}

export class Paginator extends Component<PaginatorProps, any> {
  constructor(props: any, context: any) {
    super(props, context);
  }
  render() {
    return (
      <div className="paginator">
        <button
          className="paginator__button"
          disabled={this.props.page == 1}
          onClick={linkEvent(this, this.handlePrev)}
        >
          {i18n.t("prev")}
        </button>
        <button
          className="paginator__button"
          onClick={linkEvent(this, this.handleNext)}
        >
          {i18n.t("next")}
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
